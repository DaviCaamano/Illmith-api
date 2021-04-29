


class ErrorReport {

    report = (err) => {

        //Ideally a audit log entry would be generated here.
        console.log(err);
    }
}

module.exports = new ErrorReport();