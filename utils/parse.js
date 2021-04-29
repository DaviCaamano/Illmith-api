const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PROMISE_GATE_DEFAULT_VALUE = 10;
const moment = require('moment');
/**
A class for the parsing/formatting of strings/JSON.
*/
class Parse {

  hashPassword = (password) => {

    return new Promise(async (resolve, reject) => {

      let salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
      bcrypt.hash(password, salt, (err, hash) => {

        if(err) reject(err);
        else resolve(hash);
      })
    })

  };

  signJWT = (data, remember) => {

    return new Promise((resolve, reject) => {

      let token = jwt.sign(data, process.env.JWT_SECRET,
          remember? { expiresIn: '14 days' }: { expiresIn: '1 days' });
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

        if(err) reject(err);
        else resolve({ token, decoded });
      });
    })

  };

  jwtVerify = (token) => {

    return new Promise((resolve, reject) => {

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

        if(err) reject(err);
        else resolve(decoded);
      })
    });
  }

  promiseGate = (
      callback,
      argumentCollection,
      promiseGate = PROMISE_GATE_DEFAULT_VALUE,
      originalResolve = null,
      valueCollection = []
  ) => {

    if(!valueCollection) valueCollection = [];
    return new Promise((resolve, reject) => {

      let prmCollection = [];
      for (let i = 0; i < promiseGate && argumentCollection.length > 0; i++) {

        prmCollection.push(callback(...argumentCollection.shift()));
      }

      Promise.all(prmCollection).then(values => {

        if (valueCollection.length > 0) {
          valueCollection.push.apply(valueCollection, values);
          values = valueCollection;
        } else valueCollection = values;
        //Always finally resolve with the last
        if (!originalResolve) originalResolve = resolve;

        if (argumentCollection.length === 0) return originalResolve(values)
        //if there are more promises to proccess.
        this.promiseGate(callback, argumentCollection, promiseGate, originalResolve, values)
      })
    })
  }

  getIp = (req) => {

    return req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);
  }

  randomizeString(length) {
    const result           = [];
    const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() *
          charactersLength)));
    }
    return result.join('');
  }
}



module.exports = new Parse();
