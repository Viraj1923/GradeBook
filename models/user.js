const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    Fname: { type: String, required: true },
    Lname: { type: String, required: true },
    rollNo: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    PhNo: { type: String, required: true },
    subject: String,
    semester: String,
    marks: Number,
});

module.exports = mongoose.model('User', userSchema);
