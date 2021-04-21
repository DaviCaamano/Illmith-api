const nodemailer = require('nodemailer');
const parse = require('../utils/Parse');

const frontEndUrl = 'http://localhost:3000'
// const frontEndUrl = process.env.SITE_URL


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'noreplysennoscampaign@gmail.com',
        pass: 'yjzmznwoxehdaytj'
    }
});

const mailOptions = (from, to, subject, html) => {

    if(Array.isArray(to)) to = to.Join(', ');
    return { from, to, subject, html }
}
const registerUserOption = (to, token) => {

    console.log('token');
    console.log(token);

    //REAL URL:         <a href="${process.env.SITE_URL}/user/CompleteUserRegistration/${token}">
    return mailOptions(
        'noreplysennoscampaign@gmail.com',
        to,
        'Illmith Campaign User Registration',
        `
        <h1>Illmith User Registration</h1>
        <p>
            Thank you for registering an account with us at Illmith.com. If you like the world we\'ve built, feel free 
            to show your support at our 
            <a href="${frontEndUrl}/donate">
                donation page.
            </a>
        </p>
        <br />
       
        <a href="${frontEndUrl}/user/CompleteUserRegistration/${token}">
            <b style="font-size: 24px">Click here to complete your account registration.</b>
        </a>`
    );
}

const forgotPasswordOptions = (to, token) => {

    /**
     *
     * use randomizeString(length) in User.js and pass it into the second argument of this function.
     */
    console.log('token');
    console.log(token);

    //REAL URL:         <a href="${process.env.SITE_URL}/user/CompleteUserRegistration/${token}">
    return mailOptions(
        'noreplysennoscampaign@gmail.com',
        to,
        'Illmith Campaign User Registration',
        `
        <h1>Illmith User Registration</h1>
        <p>
            A request has been made to your Illmith.com account for its password to be reset.
            
            <b>If you did not make this request, please ignore this message. 
            If you did, click the link below to reset your password.</b>
        </p>
        <br />
       
        <a href="${frontEndUrl}/user/resetpassword/${token}">
            <b style="font-size: 24px">Click here to complete your account registration.</b>
        </a>`
    );
}

class Mail {

    sendUserRegistrationEmail = (to, token) => {
        return new Promise((resolve, reject) => {

            transporter.sendMail(registerUserOption(to, token))
                .then(resolve)
                .catch(reject);
        })
    }

}

module.exports = new Mail();