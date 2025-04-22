const { text } = require("body-parser");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    port: 465,
    auth: {
        user: "pshubh619@gmail.com",
        pass: "hpud ykut qjlv hoag"
    }
});

// async function sendEmails(studentsToEmail, emailSubject, emailText) {
//     try {
//         for (const student of studentsToEmail) {
//             const { _doc } = student;

//             if (!_doc.email) {
//                 console.error(`Skipping student ${_doc.rollNo || "Unknown RollNo"} due to missing email.`);
//                 continue;
//             }

//             // Format marks details (if any)
//             let marksText = "";
//             if (_doc.subjectMarks && _doc.subjectMarks.length > 0) {
//                 marksText = "\n\nMarks Details:\n";
//                 marksText += _doc.subjectMarks.map(sub =>
//                     `${sub.subject} - ${sub.obtainedMarks} / ${sub.totalMarks}`
//                 ).join("\n");
//             }

//             const fullMessage = `${emailText}${marksText}`;

//             const mailOptions = {
//                 from: "pshubh619@gmail.com",
//                 to: _doc.email,
//                 subject: emailSubject,
//                 text: fullMessage
//             };

//             console.log(`Sending email to: ${_doc.email}`);
//             await transporter.sendMail(mailOptions);
//         }

//         console.log("Students to email:", studentsToEmail);
//         console.log("Emails sent successfully!");
//     } catch (error) {
//         console.error("Error sending emails:", error);
//     }
// }

async function sendEmails(studentsToEmail, emailSubject, emailText) {
    try {
        for (const student of studentsToEmail) {
            if (!student.email) {
                console.error(`Skipping student ${student.rollNo} due to missing email.`);
                continue;
            }

            let marksText = "";
            if (student.subjectMarks && student.subjectMarks.length > 0) {
                marksText = "\n\nMarks Details:\n";
                marksText += student.subjectMarks.map(sub =>
                    `${sub.subject}: ${sub.obtainedMarks} / ${sub.totalMarks}`
                ).join("\n");
            }

            const fullMessage = `${emailText}\n\nName: ${student.name}\nRoll No: ${student.rollNo}${marksText}`;

            const mailOptions = {
                from: "pshubh619@gmail.com",
                to: student.email,
                subject: emailSubject,
                text: fullMessage
            };

            console.log(`Sending email to: ${student.email}`);
            await transporter.sendMail(mailOptions);
        }

        console.log("All emails sent.");
    } catch (error) {
        console.error("Error sending emails:", error);
    }
}


module.exports = { sendEmails };
