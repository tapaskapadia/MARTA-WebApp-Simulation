var express = require('express');
var router = express.Router();
var randomstring = require("randomstring");
var expressValidator = require('express-validator');
var bcrypt = require('bcrypt');
const saltRounds = 10;
var randomstring = require("randomstring");
var passport = require('passport');



router.get('/breezecardmgmt', function(req, res, next) {
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict);',function(err,results,fields){
          if (err) throw error;
          var ValidCards = results;
          db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard;', function(err,results,fields){
            if (err) throw error;
            var NotValidCards = results;

        res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards,  validcards:ValidCards, showSuspended : true});
      });
      });
    } else {
        res.redirect('/profile');
      }

      });
   } else {
     res.redirect('/home');
   }
});


router.post('/breezecardmgmt', function(req, res, next) {
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        const owner = req.body.owner;
      //  console.log(owner)
        const cardnum = req.body.bcardnum;
    //    console.log(cardnum)
        const startFare = req.body.startFare;
      //  console.log(startFare)
        const endFare = req.body.endFare;
      //  console.log(endFare)
        const showSuspended = ((req.body.suspendedCards === "showSuspended") ? true: false);
    //    console.log(showSuspended)

    if (owner && cardnum && startFare && endFare && showSuspended) {
      // everything given - show suspended
      db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND BelongsTo=? AND Value BETWEEN ? AND ? AND Breezecard.BreezecardNum =?',[owner, startFare, endFare, cardnum],function(err,results,fields){
        if (err) {
          throw err;
        };
        var ValidCards = results;
        db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard WHERE BelongsTo=? AND Value BETWEEN ? AND ? AND Breezecard.BreezecardNum =? ',[owner, startFare, endFare, cardnum], function(err,results,fields){
          if (err) throw error;
          var NotValidCards = results;

      return res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards, validcards: ValidCards, owner:owner, showSuspended : showSuspended,
        cardnum:cardnum , startFare : startFare, endFare : endFare});
      });
    });

  } else if (owner && cardnum && startFare && endFare && !showSuspended) {
      db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND BelongsTo=? AND Value BETWEEN ? AND ? AND Breezecard.BreezecardNum =?',[owner, startFare, endFare, cardnum],function(err,results,fields){
        if (err) {
          throw err;
        };
        var ValidCards = results;

        return res.render('breezecardmgmt', {title: "Breeze Cards", validcards: ValidCards, owner:owner, showSuspended : showSuspended,
          cardnum:cardnum , startFare : startFare, endFare : endFare});
        });

    } else if (owner && cardnum && showSuspended) {
      db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND BelongsTo=? AND Breezecard.BreezecardNum =?',[owner, cardnum],function(err,results,fields){
        if (err) {
          throw err;
        };
        var ValidCards = results;
        db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard WHERE BelongsTo=?  AND Breezecard.BreezecardNum =? ',[owner, cardnum], function(err,results,fields){
          if (err) throw error;
          var NotValidCards = results;

      return res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards, validcards: ValidCards, owner:owner, showSuspended : showSuspended,
        cardnum:cardnum , startFare : startFare, endFare : endFare});
      });
    });

  } else if (owner && cardnum && !showSuspended) {
    db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND BelongsTo=? AND Breezecard.BreezecardNum =?',[owner, cardnum],function(err,results,fields){
      if (err) {
        throw err;
      };
      var ValidCards = results;

      return res.render('breezecardmgmt', {title: "Breeze Cards", validcards: ValidCards, owner:owner, showSuspended : showSuspended,
        cardnum:cardnum , startFare : startFare, endFare : endFare});
      });
  } else if (owner && endFare && startFare && showSuspended) {

    db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND BelongsTo=? AND Value BETWEEN ? AND ?',[owner, startFare, endFare],function(err,results,fields){
      if (err) {
        throw err;
      };
      var ValidCards = results;
      db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard WHERE BelongsTo=? AND Value BETWEEN ? AND ? ',[owner, startFare, endFare], function(err,results,fields){
        if (err) throw error;
        var NotValidCards = results;

    return res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards, validcards: ValidCards, owner:owner, showSuspended : showSuspended,
      cardnum:cardnum , startFare : startFare, endFare : endFare});
    });
  });

} else if (owner && endFare && startFare && !showSuspended) {

  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND BelongsTo=? AND Value BETWEEN ? AND ?',[owner, startFare, endFare],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;

    return res.render('breezecardmgmt', {title: "Breeze Cards", validcards: ValidCards, owner:owner, showSuspended : showSuspended,
      cardnum:cardnum , startFare : startFare, endFare : endFare});
    });

} else if (cardnum && startFare && endFare && showSuspended) {

  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Value BETWEEN ? AND ? AND Breezecard.BreezecardNum =?',[startFare, endFare, cardnum],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;
    db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard WHERE Value BETWEEN ? AND ? AND Breezecard.BreezecardNum =? ',[startFare, endFare, cardnum], function(err,results,fields){
      if (err) throw error;
      var NotValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards, validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });
});

} else if (cardnum && startFare && endFare && !showSuspended) {

  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Value BETWEEN ? AND ? AND Breezecard.BreezecardNum =?',[startFare, endFare, cardnum],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards",  validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });
} else if (owner && showSuspended) {
  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND BelongsTo=?',[owner],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;
    db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard WHERE BelongsTo=?',[owner], function(err,results,fields){
      if (err) throw error;
      var NotValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards, validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });
});

} else if (owner && !showSuspended) {
  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND BelongsTo=?',[owner],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards", validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });

} else if (startFare && endFare && showSuspended) {
  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Value BETWEEN ? AND ?',[startFare, endFare],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;
    db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard WHERE Value BETWEEN ? AND ?',[startFare, endFare], function(err,results,fields){
      if (err) throw error;
      var NotValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards, validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });
});

} else if (startFare && endFare && !showSuspended) {
  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Value BETWEEN ? AND ?',[startFare, endFare],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;


  return res.render('breezecardmgmt', {title: "Breeze Cards", validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });

} else if (cardnum && showSuspended) {
  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Breezecard.BreezecardNum =?',[cardnum],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;
    db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard WHERE Breezecard.BreezecardNum =? ',[cardnum], function(err,results,fields){
      if (err) throw error;
      var NotValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards, validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });
});

} else if (cardnum && !showSuspended) {

  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Breezecard.BreezecardNum =?',[cardnum],function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards", validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });

} else if (!showSuspended) {
  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict)',function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards", validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });

} else if (showSuspended) {
  db.query('SELECT DISTINCT BreezecardNum, Value, BelongsTo FROM Breezecard WHERE BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict)',function(err,results,fields){
    if (err) {
      throw err;
    };
    var ValidCards = results;
    db.query('SELECT DISTINCT BreezecardNum, Value FROM Conflict NATURAL JOIN Breezecard', function(err,results,fields){
      if (err) throw error;
      var NotValidCards = results;

  return res.render('breezecardmgmt', {title: "Breeze Cards", notvalidcards : NotValidCards, validcards: ValidCards, owner:owner, showSuspended : showSuspended,
    cardnum:cardnum , startFare : startFare, endFare : endFare});
  });
});

}  else {
    console.log("HERE");
      res.render('breezecardmgmt', {title: "Breeze Cards", owner:owner, showSuspended : showSuspended,
      cardnum:cardnum , startFare : startFare, endFare : endFare});

    }

    } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});


module.exports = router;
