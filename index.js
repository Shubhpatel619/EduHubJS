const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { sendEmails } = require("./email");

const app = express();
app.use(express.json());
app.use(cors());

//connect to mongodb cloud 
const dbUrl = 'mongodb+srv://EducationHub:EducationHub@cluster0.dnndllo.mongodb.net/EduHubMarks?retryWrites=true&w=majority&appName=Cluster0'

const PORT = 4000;
const MONGO_URI = 'mongodb://localhost:27017/EduHubMarks';

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

/* -------------- User Schema & Model -------------- */
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    mobile: { type: String, required: true , unique: true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }] // Stores class IDs
});

const User = mongoose.model('User', userSchema);

/* -------------- Class Schema & Model -------------- */

const studentSchema = new mongoose.Schema({
  rollNo: { type: Number },
  name: { type: String },
  surname: { type: String, },
  parent: { type: String },
  mobile: { type: String },
  email1: { type: String },
  email2: { type: String }
});

const classSchema = new mongoose.Schema({
    className: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    students: [studentSchema]
});


const Class = mongoose.model('Class', classSchema);

/* -------------- Signup API -------------- */
app.post('/signup', async (req, res) => {
    try {
        const { fullName, userName, mobile, email, password } = req.body;

        if (!fullName || !mobile || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
        if (existingUser) {
            return res.status(409).json({ message: "User already registered" });
        }

        // const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ fullName, userName, mobile, email, password });

        await newUser.save();
        res.status(201).json({ 
            message: "User registered successfully",
            userId: newUser._id 
        });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/* -------------- Login API -------------- */
app.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body; // renamed from `email` to `login`

        if (!login || !password) {
            return res.status(400).json({ message: "Login and password are required" });
        }

        // Check if login is an email or mobile number
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login);
        const query = isEmail ? { email: login } : { mobile: login };

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({ message: "User does not exist" });
        }

        // If you are using bcrypt, replace this with bcrypt.compare
        const isPasswordValid = password === user.password;
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Wrong password" });
        }

        res.status(200).json({
            message: "Login successful",
            fullName: user.fullName,
            userId: user._id
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/* -------------- Create Class API -------------- */
app.post('/create-class', async (req, res) => {
    try {
        const { className, userId } = req.body;

        if (!className || !userId) {
            return res.status(400).json({ message: "Class name and user ID are required." });
        }

        // Create new class
        const newClass = new Class({ className, createdBy: userId });
        await newClass.save();

        // Update user with new class ID
        await User.findByIdAndUpdate(userId, { $push: { classIds: newClass._id } });

        res.status(201).json({ message: "Class created successfully!", classId: newClass._id });

    } catch (error) {
        console.error("Class Creation Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/* -------------- Get User's Classes API -------------- */
app.get('/get-classes/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Find user and populate class details
        const user = await User.findById(userId).populate("classIds");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user.classIds);

    } catch (error) {
        console.error("Fetch Classes Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/* -------------- Delete Class API -------------- */
app.delete('/delete-class/:classId/:userId', async (req, res) => {
    try {
        const { classId, userId } = req.params;

        await Class.findByIdAndDelete(classId);

        await User.findByIdAndUpdate(userId, { $pull: { classIds: classId } });

        res.status(200).json({ message: "Class deleted successfully!" });

    } catch (error) {
        console.error("Class Deletion Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/* -------------- Get Students API -------------- */
app.get('/get-students/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const classData = await Class.findById(classId);

        if (!classData) {
            return res.status(404).json({ message: "Class not found" });
        }

        res.json(classData.students.sort((a, b) => a.rollNo - b.rollNo));

    } catch (error) {
        console.error("Get Students Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


/* -------------- Add Student API -------------- */
app.post('/add-student', async (req, res) => {
    try {
        let { rollNo, name, surname, parent, mobile, email1, email2, classId } = req.body;

        if (!rollNo || !name || !surname || !parent || !mobile || !email1 || !classId) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Ensure rollNo is a number
        rollNo = parseInt(rollNo, 10);

        // Check if the roll number already exists in the class
        const existingStudent = classData.students.find(student => student.rollNo === rollNo);
        if (existingStudent) {
            return res.status(409).json({ message: "Student with this roll number already exists in this class" });
        }

        // console.log({ rollNo, name, surname, parent, mobile, email1, email2,classId});
        // Add new student
        classData.students.push({ rollNo, name, surname, parent, mobile, email1, email2 });
        await classData.save();

        res.status(201).json({ message: "Student added successfully", student: { rollNo, name, surname, parent, mobile, email1, email2 } });

    } catch (error) {
        console.error("Add Student Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



/* -------------- Delete Student API -------------- */
app.delete('/delete-student/:classId/:rollNo', async (req, res) => {
    try {
        const { classId, rollNo } = req.params;
        const classData = await Class.findById(classId);

        if (!classData) {
            return res.status(404).json({ message: "Class not found" });
        }

        classData.students = classData.students.filter(student => student.rollNo !== parseInt(rollNo));
        await classData.save();

        res.status(200).json({ message: "Student removed successfully" });

    } catch (error) {
        console.error("Delete Student Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


app.post("/send-email", async (req, res) => {
    try {
        const { classId, selectedStudents, emailSubject, emailText } = req.body;

        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({ message: "Class not found." });
        }

        // Match selected students with emails from DB
        const studentsToEmail = selectedStudents.map(s => {
            const dbStudent = classData.students.find(std => std.rollNo === s.rollNo);
            return {
                ...s,
                name: dbStudent?.name || "Unknown",
                email: dbStudent?.email || null
            };
        });

        const filtered = studentsToEmail.filter(s => s.email);
        if (filtered.length === 0) {
            return res.status(404).json({ message: "No student emails found." });
        }

        await sendEmails(filtered, emailSubject, emailText);

        res.status(200).json({ message: "Emails sent successfully!" });
    } catch (error) {
        console.error("Send Email Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// app.post("/send-email", async (req, res) => {
//     try {
//         const { classId, selectedStudents, emailSubject, emailText } = req.body;

//         console.log("Received classId:", classId);
//         console.log("Received selectedStudents:", selectedStudents);

//         const classData = await Class.findById(classId);
//         if (!classData) {
//             return res.status(404).json({ message: "Class not found." });
//         }

//         console.log("Stored roll numbers in DB:", classData.students.map(s => s.rollNo));

//         let studentsToEmail = classData.students.filter(student =>
//             selectedStudents.some(s => s.rollNo === student.rollNo)
//         ).map(student => {
//             const studentData = selectedStudents.find(s => s.rollNo === student.rollNo);
//             return { ...student, subjectMarks: studentData.subjectMarks };
//         });

//         console.log("Filtered students with marks:", studentsToEmail);

//         if (studentsToEmail.length === 0) {
//             return res.status(404).json({ message: "No students found with the provided roll numbers." });
//         }

//         await sendEmails(studentsToEmail, emailSubject, emailText);

//         res.status(200).json({ message: "Emails sent successfully!" });
//     } catch (error) {
//         console.error("Send Email Error:", error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// });


/* -------------- Start Server -------------- */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});