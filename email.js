const { text } = require("body-parser");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    port: 465,
    auth: {
        user: "ieducation.hub.2013@gmail.com",
        pass: "ssox qvhj knrs lvov"
    }
});


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
                marksText += student.subjectMarks.map(sub => {
                    const marksDisplay = sub.obtainedMarks === -1
                        ? "Absent"
                        : `${sub.obtainedMarks} / ${sub.totalMarks}`;
                    return `${sub.subject}: ${marksDisplay}`;
                }).join("\n");
            }

            const fullMessage = `${emailText}\n\nName: ${student.name}\nRoll No: ${student.rollNo}${marksText}`;

            const mailOptions = {
                from: "ieducation.hub.2013@gmail.com",
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



// Send OTP Email
async function sendOtpEmail(toEmail, otp) {
    const mailOptions = {
        from: "ieducation.hub.2013@gmail.com",
        to: toEmail,
        subject: "Your OTP for EduHub",
        text: `Your OTP is ${otp}. It is valid for 5 minutes.`
    };
     await transporter.sendMail(mailOptions);
}

module.exports = {
    sendEmails,
    sendOtpEmail
};


//fbqk qtgt ells fgzo     (app password)
