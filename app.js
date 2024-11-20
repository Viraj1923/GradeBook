// app.js
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/user');
const Teacher = require('./models/teacher');
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const port = 3000;

const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(router);
app.set('views', path.join(__dirname, 'views'));  // Set path to views directory
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());  // Add this if you expect JSON data



//---------------------------------------------------------------------------------------------------------------------------------


// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/userDB', {})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.log(err));


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');



//---------------------------------------------------------------------------------------------------------------------------------


// Routes

// For teacher login page (GET)
app.get('/teacher-login', (req, res) => {
    res.render('login'); // Render login page
});

app.get('/teacher-register', (req, res) => {
    res.render('register');  // Render register.ejs from views folder
});

app.get('/create', (req, res) => {
    res.render('index');  // Render register.ejs from views folder
});

app.get('/',(req,res)=>{
    res.render('landing');
})
// Route to show the index page (Create Student)
app.get('/dashboard', (req, res) => {
    const token = req.cookies.token;  // Assuming you're using cookies for JWT

    // Check if the token exists and is valid
    if (!token) {
        return res.redirect('/teacher-login');  // Redirect to login if not authenticated
    }

    jwt.verify(token, '7387190603', (err, decoded) => {
        if (err) {
            return res.redirect('/teacher-login');  // Redirect if token is invalid
        }
        
        // Token is valid, allow access to the create student page
        res.render('index', { user: null });
    });
});



// POST route for creating a new user
app.post('/create', async (req, res) => {
    const { Fname, Lname, rollNo, email, PhNo ,subject,semester,marks} = req.body;

    try {
        const newUser = new User({ Fname, Lname, rollNo, email, PhNo,subject,semester,marks});
        await newUser.save();
        res.redirect('/read');
    } catch (error) {
        console.log('Error creating user:', error);
        res.status(500).send('Error saving user');
    }
});

// GET route for reading users
app.get('/read', async (req, res) => {
    try {
        const users = await User.find({});
        res.render('read', { user: users });
    } catch (error) {
        console.log('Error fetching users:', error);
        res.status(500).send('Error fetching users');
    }
});

// GET route for editing a user
app.get('/edit/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findById(userId);
        res.render('index', { user }); // Render edit form with user data
    } catch (error) {
        console.log('Error fetching user for edit:', error);
        res.status(500).send('Error fetching user');
    }
});

// POST route for updating a user
app.post('/update/:id', async (req, res) => {
    const userId = req.params.id;
    const { Fname, Lname, rollNo, email, PhNo,subject,semester,marks } = req.body;

    try {
        await User.findByIdAndUpdate(userId, { Fname, Lname, rollNo, email, PhNo,subject,semester,marks });
        res.redirect('/read');
    } catch (error) {
        console.log('Error updating user:', error);
        res.status(500).send('Error updating user');
    }
});

// GET route for deleting a user
app.get('/delete/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        await User.findByIdAndDelete(userId);
        res.redirect('/read');
    } catch (error) {
        console.log('Error deleting user:', error);
        res.status(500).send('Error deleting user');
    }
});


app.get('/studentRes',(req,res)=>{
      res.render('result');
});

//---------------------------------------------------------------------------------------------------------------------------------


//teacher reg
app.post('/teacher-register', async (req, res) => {
    console.log(req.body);  // Log the request body to see its contents

    const { userId, password } = req.body;  // Destructure after verifying the body is correct
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newTeacher = new Teacher({ userId, password: hashedPassword });
        await newTeacher.save();
        res.redirect('/teacher-login');
    } catch (error) {
        res.status(500).send('Error registering teacher');
    }
});


// POST route for teacher login
app.post('/teacher-login', async (req, res) => {
    const { userId, password } = req.body;
    
    const teacher = await Teacher.findOne({ userId });
    // res.redirect('/teacher-login');
    if (!teacher || !bcrypt.compareSync(password, teacher.password)) {
        return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign({ teacherId: teacher._id }, '7387190603', { expiresIn: '1m' });

    res.cookie('token', token, { httpOnly: true }); // Store token in cookies for the client
    res.redirect('/dashboard');  // Redirect to the create student page after successful login
});


// Middleware to check if teacher is authenticated
const authenticateTeacher = (req, res, next) => {
    const token = req.cookies.token; // Check if token is in cookies
    
    if (!token) {
        return res.redirect('/teacher-login');  // Redirect to login if no token
    }

    jwt.verify(token, '7387190603', (err, decoded) => {
        if (err) {
            return res.redirect('/teacher-login');  // Redirect if token is invalid
        }

        req.teacher = decoded;  // Attach decoded token data to the request
        next();  // Proceed to the next middleware or route handler
    });
};

// Use this middleware for any routes that require authentication
app.use('/add-result', authenticateTeacher);

//---------------------------------------------------------------------------------------------------------------------------------




// Add Result for Student
app.post('/add-result/:rollNo', authenticateTeacher, async (req, res) => {
    const { rollNo } = req.params;
    const { subject, semester, marks } = req.body;

    try {
        const student = await User.findOne({ rollNo });
        if (!student) return res.status(404).send('Student not found');

        student.results.push({ subject, semester, marks });
        await student.save();
        res.status(200).send('Result added');
    } catch (error) {
        res.status(500).send('Error adding result');
    }
});

// Edit Student Result
router.post('/edit-result/:rollNo', authenticateTeacher, async (req, res) => {
    const { rollNo } = req.params;
    const { subject, semester, marks } = req.body;

    try {
        const student = await User.findOne({ rollNo });
        if (!student) return res.status(404).send('Student not found');

        const result = student.results.find(r => r.subject === subject && r.semester === semester);
        if (result) {
            result.marks = marks;
            await student.save();
            res.status(200).send('Result updated');
        } else {
            res.status(404).send('Result not found');
        }
    } catch (error) {
        res.status(500).send('Error editing result');
    }
});

// View Student Result
app.post('/view-result', async (req, res) => {
    const { rollNo } = req.body;

    try {
        const student = await User.findOne({ rollNo });
        if (!student) return res.status(404).send('Student not found');

        // Render the student's result using DisplayResult.ejs
        res.render('DisplayResult', { student });
    } catch (error) {
        res.status(500).send('Error fetching result');
    }
});






// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


//---------------------------------------------------------------------------------------------------------------------------------