var express = require('express');
var router = express.Router();
var expressValidator = require('express-validator');
var bcrypt = require('bcrypt');
const saltRounds = 10;
var randomstring = require("randomstring");
var passport = require('passport');

/* GET home page. */
router.get('/', function(req,res) {
  //console.log(req.user);
  //console.log(req.isAuthenticated());
  res.render('home', { title: 'Home' });
});

router.post('/login',passport.authenticate(
  'local', {
    successRedirect:'/profile',
    failureRedirect:'/login'
}));


router.get('/profile',authenticationMiddleware() ,function(req,res){
    //console.log(req.isAuthenticated())
    //console.log(req.user.user_id)
    if (req.isAuthenticated()) {
      var adc = "apple";
      //console.log(req.user);
      const db = require('../db.js');
      db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        res.redirect('/admin');
      } else {
        res.redirect('/users');
      }
      });
    } else {
      res.redirect('/users');
    }
});


router.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});
router.get('/register', function(req, res, next) {
  res.render('register', { title: 'Registration' });
});

router.get('/stuff', function(req, res) {
  //console.log(req.user_id);
  res.render('stuff', { un: req.user});
});

router.get('/admin',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        res.render('admin',{title:"ADMIN PAGE"});
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login' });
});


///////////////////////////////////////////////////////////////////////////////
router.post('/station',authenticationMiddleware(), function(req, res) {
  console.log(req.body.stopID);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        const reqStopID = req.body.stopID;
        db.query('SELECT Name, EnterFare, ClosedStatus, IsTrain, Intersection FROM Station LEFT OUTER JOIN BusStationIntersection ON Station.StopID = BusStationIntersection.StopID WHERE Station.StopID = ?'
        ,[reqStopID],function(err,results,fields){
          if (err) throw error;

          const stationName = results[0].Name;
          const stopID = reqStopID;
          const enterFare = results[0].EnterFare;
          const closedStatus = results[0].ClosedStatus;
          const isTrain = results[0].IsTrain;
          const hasIntersection = ((results[0].Intersection === null) ? false : true)
          const Intersection = results[0].Intersection;

          res.render('station', { title: 'Station Detail', stationName : stationName,
          stopID : stopID, enterFare: enterFare, closedStatus : closedStatus,
          isTrain: isTrain, hasIntersection : hasIntersection, Intersection : Intersection});
        });
      } else {
        res.redirect('/profile');
      }
      });

    }

});


router.get('/station',authenticationMiddleware(), function(req, res) {
  const db = require('../db.js');
  if (req.isAuthenticated()) {
   db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
     if (err) throw error;
     if(results[0].isAdmin){
       res.redirect('/stationmgmt');
     } else {
       res.redirect('/profile');
     }
     });
   }
});

router.post('/updatestation',authenticationMiddleware(), function(req, res) {
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        req.checkBody('entryFare','Entry Fare must be a number between $0.00 and $50.00').isFloat({min: 0.00, max: 50.00});
        const errors = req.validationErrors();
        if (errors) {
          db.query('SELECT Name, EnterFare, ClosedStatus, IsTrain, Intersection FROM Station LEFT OUTER JOIN BusStationIntersection ON Station.StopID = BusStationIntersection.StopID WHERE Station.StopID = ?'
          ,[req.body.stopID],function(err,results,fields){
            if (err) throw error;

            const stationName = results[0].Name;
            const stopID = req.body.stopID;
            const enterFare = results[0].EnterFare;
            const closedStatus = results[0].ClosedStatus;
            const isTrain = results[0].IsTrain;
            const hasIntersection = ((results[0].Intersection === null) ? false : true)
            const Intersection = results[0].Intersection;

            res.render('station', { title: 'Station Detail', errors:errors, stationName : stationName,
            stopID : stopID, enterFare: enterFare, closedStatus : closedStatus,
            isTrain: isTrain, hasIntersection : hasIntersection, Intersection : Intersection});
          });
        } else {
          const stopID = req.body.stopID;
          const entryFare = req.body.entryFare;
          const closedStatus = ((req.body.stationStatus === "open") ? false : true);
          db.query('UPDATE Station SET ClosedStatus = ? , EnterFare = ? WHERE Station.StopID=?'
          ,[closedStatus, entryFare, stopID],function(err,results,fields){
              if (err) throw err;
            });
          res.redirect('/stationmgmt');
        }
      } else {
        res.redirect('/profile');
      }
      });
    }
});


///////////////////////////////////////////////////////////////////////////////
// GET CREATE STATION
router.get('/createstation',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        res.render('createstation',{title:"Create New Station"});
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

// POST CREATE STATION

router.post('/createstation', function(req, res, next) {

  const db = require('../db.js');
  //Quick Validation
  req.checkBody('stationName', 'Station Name cannot be empty').notEmpty();
  req.checkBody('stopID', 'StopID cannot be empty').notEmpty();
  req.checkBody('entryFare','Entry Fare must be a number between $0.00 and $50.00').isFloat({min: 0.00, max: 50.00});

  if (req.body.stationChoice === "trainChoice") {
    req.checkBody('nearestIntersection','Train Stations do not have a Nearest Intersection').len(0,0);
  }

  const errors = req.validationErrors();

  if (errors) {
    res.render('createstation',{
      errors: errors
    });
  } else {
    // VARS NEEDED FOR STATION AND BUS STTION INTERSECTION
    const stationName = req.body.stationName;
    const stopID = req.body.stopID;
    const entryFare = req.body.entryFare;
    const isTrain = ((req.body.stationChoice === "trainChoice") ? true : false);
    const nearestIntersection =  req.body.nearestIntersection;
    const closedStatus = ((req.body.stationStatus === "open") ? false : true);
    db.query('SELECT StopID FROM Station WHERE StopID=? ', [stopID], function(error, results, fields) {
      console.log(results);
      if (results.length > 0) {
        console.log("results")
        return res.render('createstation', {title: 'Create New Station', errorsInd:'StopID already exists'});
      }
      db.query('SELECT Name, isTrain FROM Station WHERE Name=? AND isTrain=?', [stationName, isTrain], function(error, results, fields) {
        if (results.length > 0) {
          console.log("results")
          return res.render('createstation', {title: 'Create New Station', errorsInd:'Station name and type already exist'});
        }
        // ADD To Station DB
        db.query('INSERT INTO Station (StopID,Name,EnterFare,ClosedStatus,isTrain) VALUES (?,?,?,?,?)',[stopID,stationName,entryFare,closedStatus,isTrain],
        function(error, results, fields) {
          if(error) {
            //console.log(error)
            throw error;
          } else {
            if (nearestIntersection !== "" && !isTrain) {
              db.query('INSERT INTO BusStationIntersection (StopID,Intersection) VALUES (?,?)', [stopID, nearestIntersection],
              function(error, results, fields) {
                if(error) {
                  //console.log(error)
                  throw error;
                }
              });
            }
          }
        });
        res.redirect('/createstation');
      });
    });
  };
});



///////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// STATION MANAGEMENT
router.get('/stationmgmt',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT * FROM Station', function(err,results,fields){
          if (err) throw error;
          var bb = results;
          res.render('stationmgmt', {title:"Station Listing", stations: bb});
        });
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

router.get('/snasc',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT * FROM Station ORDER BY Name', function(err,results,fields){
          if (err) throw error;
          res.render('stationmgmt', {title:"Station Listing", stations: results});
        });
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

router.get('/sidasc',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT * FROM Station ORDER BY StopID', function(err,results,fields){
          if (err) throw error;
          res.render('stationmgmt', {title:"Station Listing", stations: results});
        });
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

router.get('/siddes',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT * FROM Station ORDER BY StopID DESC', function(err,results,fields){
          if (err) throw error;
          res.render('stationmgmt', {title:"Station Listing", stations: results});
        });
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

router.get('/fareasc',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT * FROM Station ORDER BY EnterFare', function(err,results,fields){
          if (err) throw error;
          res.render('stationmgmt', {title:"Station Listing", stations: results});
        });
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

router.get('/faredes',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT * FROM Station ORDER BY EnterFare DESC', function(err,results,fields){
          if (err) throw error;
          res.render('stationmgmt', {title:"Station Listing", stations: results});
        });
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

router.get('/statusasc',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT * FROM Station ORDER BY ClosedStatus', function(err,results,fields){
          if (err) throw error;
          res.render('stationmgmt', {title:"Station Listing", stations: results});
        });
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});

router.get('/statusdes',authenticationMiddleware(), function(req, res) {
  //console.log(req.user_id);
  const db = require('../db.js');
   if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('SELECT * FROM Station ORDER BY ClosedStatus DESC', function(err,results,fields){
          if (err) throw error;
          res.render('stationmgmt', {title:"Station Listing", stations: results});
        });
      } else {
        res.redirect('/profile');
      }
      });
   } else {
     res.redirect('/home');
   }
});


///////////////////////////////////////////////////////////////////////////////


//GET SUSPENDED CARDS
router.get('/suspendedcards', function(req, res, next) {
  const db = require('../db.js');
  if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
    if (err) throw error;
    if(results[0].isAdmin){
      db.query('SELECT BreezeCardNum, Username, DateTime, BelongsTo FROM Conflict NATURAL JOIN Breezecard AS FullSuspend', function(err, results, fields) {
        if (err) throw error;
        //res.json({title: "Suspended Cards", results});
        //var suscards = res.json(results);
        res.render('suspendedcards',{title:"Suspended Cards", cards: results});
      });
    } else {
      res.redirect('/profile');
    }
  });
  } else {
    res.redirect('/home');
  }
});


//////////////////////////////////////////////////////////////////////////

router.post('/setvalue', function(req, res, next){
  const db = require('../db.js');
  const uinputedvalue = req.body.Value;
  const bcn = req.body.bcn;
  db.query("SELECT Value FROM Breezecard WHERE BreezecardNum=?", [bcn],function(err,results,fields){
    if (uinputedvalue > 1000.00 || uinputedvalue < 0) {
      return res.render('breezecardmgmt', {title:"Breeze Cards", errorsInd: "Value of breezecard cannot be > $1000 or < $0"});
    }
    db.query("UPDATE Breezecard SET Value= ? WHERE BreezecardNum= ?", [uinputedvalue, bcn], function(err,results,fields){
      res.redirect('/breezecardmgmt');
    });
  });
});


router.post('/transferselected', function(req, res, next){
  const db = require('../db.js');
  const person = req.body.Person;
  console.log(req.body)
  console.log(req.body.Person);
  console.log(req.body.bcn);
  const bcn = req.body.bcn;
  db.query("SELECT BelongsTo FROM Breezecard WHERE BreezecardNum=(?)", [bcn], function(err,results,fields){
    const bt = results[0].BelongsTo;
    console.log(bt);
    db.query("SELECT Username FROM Passenger WHERE Username=?", [person],function(err,results,fields){
    if(err) console.log(err);
    if (results.length > 0) {
      db.query("UPDATE Breezecard SET BelongsTo=? WHERE BreezecardNum=?", [person, bcn],function(err,results,fields){
        if(err) console.log(err);
        db.query("DELETE FROM Conflict WHERE BreezecardNum=?", [bcn], function(err,results,fields){
        if(err) console.log(err);

        db.query("SELECT COUNT(BelongsTo) AS nc From Breezecard WHERE BelongsTo = (?)",[bt],
        function(err, results, fields){
          if(err) {
            throw error;
          }else if (!results[0].nc) {
              var nrs = randomstring.generate({ length: 16, charset: 'numeric' });
            db.query("INSERT INTO Breezecard (BreezecardNum,Value,BelongsTo) VALUES  (?,?,?)", [nrs, 0.00, bt], function (err, result, fields) {
              if (err) return res.redirect('/breezecardmgmt');
            });
            return res.redirect('/breezecardmgmt');
          } else {
            return res.redirect('/breezecardmgmt');
          } 
        });
        });
      });
    } else {
      return res.render('breezecardmgmt', {title:"Breeze Cards", errorsInd: "User does not exist."});
    }
  });
});
});
router.get('/filtercard',function(req,res,next) {
  const db = require('../db.js');
  if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
    if(results[0].isAdmin){
      db.query('SELECT BreezeCardNum, Username, DateTime, BelongsTo FROM Conflict NATURAL JOIN Breezecard AS FullSuspend ORDER BY BreezeCardNum', function(err, results, fields) {
        //res.json({title: "Suspended Cards", results});
        //var suscards = res.json(results);
        res.render('suspendedcards',{title:"Suspended Cards", cards: results});
      });
    } else {
      res.redirect('/profile');
    }
  });
  } else {
    res.redirect('/home');
  }
});

router.get('/filterdateasc',function(req,res,next) {
  const db = require('../db.js');
  if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
    if (err) throw error;
    if(results[0].isAdmin){
      db.query('SELECT BreezeCardNum, Username, DateTime, BelongsTo FROM Conflict NATURAL JOIN Breezecard AS FullSuspend ORDER BY DateTime', function(err, results, fields) {
        //res.json({title: "Suspended Cards", results});
        //var suscards = res.json(results);
        res.render('suspendedcards',{title:"Suspended Cards", cards: results});
      });
    } else {
      res.redirect('/profile');
    }
  });
  } else {
    res.redirect('/home');
  }
});

router.get('/filterdatedesc',function(req,res,next) {
  const db = require('../db.js');
  if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
    if (err) throw error;
    if(results[0].isAdmin){
      db.query('SELECT BreezeCardNum, Username, DateTime, BelongsTo FROM Conflict NATURAL JOIN Breezecard AS FullSuspend ORDER BY DateTime DESC', function(err, results, fields) {
        //res.json({title: "Suspended Cards", results});
        //var suscards = res.json(results);
        res.render('suspendedcards',{title:"Suspended Cards", cards: results});
        //res.render('suspendedcards',{title:"Suspended Cards", cards: results});
      });
    } else {
      res.redirect('/profile');
    }
  });
  } else {
    res.redirect('/home');
  }
});

router.get('/filtersnasc',function(req,res,next) {
  const db = require('../db.js');
  if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
    if (err) throw error;
    if(results[0].isAdmin){
        db.query('SELECT * FROM Step5 ORDER BY Name', function(err,results,fields) {
          res.render('passengerflow',{title:"Passenger Flow Report", flow: results});
        });
    } else {
      res.redirect('/profile');
    }
  });
  } else {
    res.redirect('/home');
  }
});









router.get('/removeConflicts/:bc/:un/:ds/:po',function(req, res, next) {
  const db = require('../db.js');
  const breezecard = req.params.bc;
  const newowner = req.params.un;
  const datesus = req.params.ds;
  const preowner = req.params.po;
  if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
    if (err) throw error;
    if(results[0].isAdmin){
      db.query('SELECT BreezecardNum FROM Breezecard WHERE (Breezecard.BelongsTo= ? AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict))',[preowner], function(err,results,fields){
        if(!results.length){
          var rs = randomstring.generate({length:16,charset:'numeric'});
          db.query("INSERT INTO Breezecard (BreezecardNum,Value,BelongsTo) VALUES  (?,?,?)",[rs,0.00,preowner], function (err, results, fields) {
            //if (err) throw error;
          });
        }
      });
      db.query('UPDATE Breezecard SET BelongsTo = ?, Value = 0.00 WHERE BreezecardNum = ?', [newowner, breezecard], function(err,results,fields){
      });
      // db.query('DELETE FROM Breezecard WHERE BreezecardNum = ?', [breezecard], function(err,results,fields){
      // });
      // db.query("INSERT INTO Breezecard (BreezecardNum,Value,BelongsTo) VALUES  (?,?,?)",[breezecard,0.00,newowner],function(err,results,fields){
      //   //if (err) throw error;
      // });
      db.query('DELETE FROM Conflict WHERE (BreezecardNum= ?)', [breezecard], function(err,results,fields){
        //if (err) throw error;
        res.redirect('/suspendedcards');
      });
    } else {
      res.redirect('/profile');
    }
  });
  } else {
    res.redirect('/home');
  }
});

router.get('/giveToPrevious/:bc/:un/:ds/:po',function(req, res, next) {
  const db = require('../db.js');
  const breezecard = req.params.bc;
  const newowner = req.params.un;
  const datesus = req.params.ds;
  const preowner = req.params.po;
  if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
    if (err) throw error;
    if(results[0].isAdmin){
      db.query('DELETE FROM Conflict WHERE (BreezecardNum= ?)', [breezecard], function(err,results,fields){
        //if (err) throw error;
        res.redirect('/suspendedcards');
      });
    } else {
      res.redirect('/profile');
    }
  });
  } else {
    res.redirect('/home');
  }
});



































router.get('/passengerflow', function(req, res, next) {
  const db = require('../db.js');
  if (req.isAuthenticated()) {
    db.query('SELECT isAdmin FROM User WHERE username =?',[req.user.user_id],function(err,results,fields){
      if (err) throw error;
      if(results[0].isAdmin){
        db.query('CREATE OR REPLACE VIEW InPass(StopID, FlowIn) AS SELECT StartsAt, Count(*) FROM Trip GROUP BY StartsAt', function(err,results,fields) {
        });
        db.query('CREATE OR REPLACE VIEW OutPass(StopID2,FlowOut) AS SELECT EndsAt, Count(*) FROM Trip WHERE EndsAt IS NOT NULL GROUP BY EndsAt', function(err,results,fields) {
        });
        db.query('CREATE OR REPLACE VIEW Revs(StopIDb,Revenueb) AS SELECT StartsAt,SUM(TripFare)FROM Trip GROUP BY StartsAt', function(err,results,fields) {
        });
        db.query('CREATE OR REPLACE VIEW Step1(StopIDa,Namea) AS SELECT StopID, Name FROM Station', function(err,results,fields) {
        });
        db.query('CREATE OR REPLACE VIEW Step2(StopIDa,NameA, FlowIn) AS SELECT StopIDa, Namea, IFNULL(FlowIn,0) FROM Step1 LEFT JOIN InPass ON Step1.StopIDa=InPass.StopID', function(err,results,fields) {
        });
        db.query('CREATE OR REPLACE VIEW Step3(StopIDa,NameA,FlowIn,FlowOut) AS SELECT StopIDa,NameA, FlowIn, IFNULL(FlowOut,0) FROM Step2 LEFT JOIN OutPass ON Step2.StopIDa=OutPass.StopID2', function(err,results,fields) {
        });
        db.query('CREATE OR REPLACE VIEW Step4(StopIDa,NameA,FlowIn,FlowOut,Flow) AS SELECT StopIDa,NameA,FlowIn,FlowOut, FlowIn-FlowOut FROM Step3', function(err,results,fields) {
        });
        db.query('CREATE OR REPLACE VIEW Step5(StopID,Name,FlowIn,FlowOut,Flow,Revenue) AS SELECT StopIDa,NameA,FlowIn,FlowOut,Flow,IFNULL(Revenueb,0) FROM Step4 LEFT JOIN Revs ON Step4.StopIDa = Revs.StopIDb', function(err,results,fields) {
        });
        db.query('SELECT * FROM Step5 ORDER BY Name', function(err,results,fields) {
          res.render('passengerflow',{title:"Passenger Flow Report", flow: results});
        });
      } else {
        res.redirect('/profile');
      }
    });
  } else {
     res.redirect('/home');
  }

});



router.post('/passengerflow', function(req, res, next) {
  const db = require('../db.js');
  const start = req.body.startTime;
  const end = req.body.endTime;
  console.log(start);
  console.log(end);
  if(start !== "" && end !== "") {
    console.log("both filter");
    db.query('CREATE OR REPLACE VIEW InPass(StopID, FlowIn) AS SELECT StartsAt, Count(*) FROM Trip WHERE StartTime>= ? AND StartTime<= ? GROUP BY StartsAt', [start, end], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW OutPass(StopID2,FlowOut) AS SELECT EndsAt, Count(*) FROM Trip WHERE EndsAt IS NOT NULL AND StartTime>= ? AND StartTime<= ? GROUP BY EndsAt', [start, end], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Revs(StopIDb,Revenueb) AS SELECT StartsAt,SUM(TripFare)FROM Trip WHERE StartTime>= ? AND StartTime<= ? GROUP BY StartsAt', [start, end], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step1(StopIDa,Namea) AS SELECT StopID, Name FROM Station', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step2(StopIDa,NameA, FlowIn) AS SELECT StopIDa, Namea, IFNULL(FlowIn,0) FROM Step1 LEFT JOIN InPass ON Step1.StopIDa=InPass.StopID', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step3(StopIDa,NameA,FlowIn,FlowOut) AS SELECT StopIDa,NameA, FlowIn, IFNULL(FlowOut,0) FROM Step2 LEFT JOIN OutPass ON Step2.StopIDa=OutPass.StopID2', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step4(StopIDa,NameA,FlowIn,FlowOut,Flow) AS SELECT StopIDa,NameA,FlowIn,FlowOut, FlowIn-FlowOut FROM Step3', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step5(StopID,Name,FlowIn,FlowOut,Flow,Revenue) AS SELECT StopIDa,NameA,FlowIn,FlowOut,Flow,IFNULL(Revenueb,0) FROM Step4 LEFT JOIN Revs ON Step4.StopIDa = Revs.StopIDb', function(err,results,fields) {
    });
    db.query('SELECT * FROM Step5 ORDER BY Name', function(err,results,fields) {
      res.render('passengerflow',{title:"Passenger Flow Report", flow: results});
    });
  } else if(start !== "" && end === "") {
    console.log("start filter");
    db.query('CREATE OR REPLACE VIEW InPass(StopID, FlowIn) AS SELECT StartsAt, Count(*) FROM Trip WHERE StartTime>= ? GROUP BY StartsAt', [start], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW OutPass(StopID2,FlowOut) AS SELECT EndsAt, Count(*) FROM Trip WHERE EndsAt IS NOT NULL AND StartTime>= ? GROUP BY EndsAt', [start], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Revs(StopIDb,Revenueb) AS SELECT StartsAt,SUM(TripFare)FROM Trip WHERE StartTime>= ? GROUP BY StartsAt', [start], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step1(StopIDa,Namea) AS SELECT StopID, Name FROM Station', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step2(StopIDa,NameA, FlowIn) AS SELECT StopIDa, Namea, IFNULL(FlowIn,0) FROM Step1 LEFT JOIN InPass ON Step1.StopIDa=InPass.StopID', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step3(StopIDa,NameA,FlowIn,FlowOut) AS SELECT StopIDa,NameA, FlowIn, IFNULL(FlowOut,0) FROM Step2 LEFT JOIN OutPass ON Step2.StopIDa=OutPass.StopID2', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step4(StopIDa,NameA,FlowIn,FlowOut,Flow) AS SELECT StopIDa,NameA,FlowIn,FlowOut, FlowIn-FlowOut FROM Step3', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step5(StopID,Name,FlowIn,FlowOut,Flow,Revenue) AS SELECT StopIDa,NameA,FlowIn,FlowOut,Flow,IFNULL(Revenueb,0) FROM Step4 LEFT JOIN Revs ON Step4.StopIDa = Revs.StopIDb', function(err,results,fields) {
    });
    db.query('SELECT * FROM Step5 ORDER BY Name', function(err,results,fields) {
      res.render('passengerflow',{title:"Passenger Flow Report", flow: results});
    });
  } else if(end !== "" && start === "") {
    console.log("end filter");
    db.query('CREATE OR REPLACE VIEW InPass(StopID, FlowIn) AS SELECT StartsAt, Count(*) FROM Trip WHERE StartTime<=? GROUP BY StartsAt', [end], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW InPass(StopID, FlowIn) AS SELECT StartsAt, Count(*) FROM Trip WHERE StartTime<=? GROUP BY StartsAt', [end], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW OutPass(StopID2,FlowOut) AS SELECT EndsAt, Count(*) FROM Trip WHERE EndsAt IS NOT NULL AND StartTime<=? GROUP BY EndsAt', [end], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Revs(StopIDb,Revenueb) AS SELECT StartsAt,SUM(TripFare)FROM Trip WHERE StartTime<=? GROUP BY StartsAt', [end], function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step1(StopIDa,Namea) AS SELECT StopID, Name FROM Station', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step2(StopIDa,NameA, FlowIn) AS SELECT StopIDa, Namea, IFNULL(FlowIn,0) FROM Step1 LEFT JOIN InPass ON Step1.StopIDa=InPass.StopID', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step3(StopIDa,NameA,FlowIn,FlowOut) AS SELECT StopIDa,NameA, FlowIn, IFNULL(FlowOut,0) FROM Step2 LEFT JOIN OutPass ON Step2.StopIDa=OutPass.StopID2', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step4(StopIDa,NameA,FlowIn,FlowOut,Flow) AS SELECT StopIDa,NameA,FlowIn,FlowOut, FlowIn-FlowOut FROM Step3', function(err,results,fields) {
    });
    db.query('CREATE OR REPLACE VIEW Step5(StopID,Name,FlowIn,FlowOut,Flow,Revenue) AS SELECT StopIDa,NameA,FlowIn,FlowOut,Flow,IFNULL(Revenueb,0) FROM Step4 LEFT JOIN Revs ON Step4.StopIDa = Revs.StopIDb', function(err,results,fields) {
    });
    db.query('SELECT * FROM Step5 ORDER BY Name', function(err,results,fields) {
      res.render('passengerflow',{title:"Passenger Flow Report", flow: results});
    });
  } else {
    res.redirect('/passengerflow');
  }
});



///////////////////////////////////////////////////////////////////////////////

router.post('/register', function(req, res, next) {
  const db = require('../db.js');
  req.checkBody('username', 'Username field cannot be empty.').notEmpty();
  req.checkBody('email','The email you entered is invalid, please try again.').isEmail();
  req.checkBody('password','Password must be between 6-100 characters long, please try again').len(8,100);
  req.checkBody('passwordMatch','Password do not match, please try again').equals(req.body.password);
  var blah = "dog";
  //console.log("body num: " + req.body.num);
  db.query("SELECT BreezecardNum, BelongsTo FROM Breezecard WHERE BreezecardNum = (?)",[req.body.num], function (err, results, fields) {
    if (err){
      throw err;
    }
     else if(!results.length){
      blah = "";
    } else {
      blah = results[0].BreezecardNum;
    }
   // console.log("results: "+ results);
   // console.log("results len: "+results.length);
   // console.log(req.body.num);
   // console.log("blah "+ blah);
  console.log("Bn: "+req.body.num);
  console.log("blah: "+blah);
  console.log(blah===req.body.num)
  req.checkBody('num','Breezecard Not in Database').equals(blah);


  const errors = req.validationErrors();

  if (errors) {
    res.render('register',{
      title: 'Registration Error',
      errors: errors
    });
  } else {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const option = req.body.breeze;
    var breezeCard = "";
    if(req.body.breeze === "option1") {
      breezeCard = req.body.num;
    } else {
      breezeCard = "-1"
    }
    bcrypt.hash(password, saltRounds, function(err, hash) {
      //console.log(hash);
      db.query('INSERT INTO User (username,password,isAdmin) VALUES (?, ?,?)',[username,hash,0],
      function(error, results, fields) {
        if(error) return res.render('register', { title: 'Registration',errorsInd:'Invalid User' });
        db.query('INSERT INTO Passenger (username,email) VALUES (?, ?)',[username,email],function(error,results,fields){
          if (error) return res.render('register', { title: 'Registration' ,errorsInd:'Invalid Email'});
          db.query('SELECT BreezecardNum, BelongsTo FROM Breezecard WHERE BreezecardNum = (?)',[breezeCard],function(error,results,field){
            if(error) {
              return res.render('register', { title: 'Registration',errorsInd: 'Breezecard Error' });
            }
            else if(!results.length){
              var rs = randomstring.generate({length:16,charset:'numeric'});
              db.query("INSERT INTO Breezecard (BreezecardNum,Value,BelongsTo) VALUES  (?,?,?)",[rs,0.00,username], function (err, result, fields) {
                if (err) return res.render('register', { title: 'Registration' ,errorsInd:'Breezecard Error. Try Again.'});
              });
            } else {
              //console.log(results[0]);
              //console.log(results[0].BelongsTo);
              if(results[0].BelongsTo == null){
                db.query("UPDATE Breezecard SET BelongsTo = (?) WHERE BreezecardNum = (?)",[username,breezeCard],
                function (err, result, fields) {
                  if (err) return res.render('register', { title: 'Registration' ,errorsInd:'Breezecard Error'});
                });
              } else {
                db.query("INSERT INTO Conflict (Username,BreezecardNum,DateTime) VALUES  (?,?,?)", [username, breezeCard, new Date().toISOString().slice(0, 19).replace('T', ' ')], function (err, result, fields) {
                  if (err) return res.render('register', { title: 'Registration' ,errorsInd:'Invalid Conflicts Add'});
                });
                var nrs = randomstring.generate({length:16,charset:'numeric'});
                db.query("INSERT INTO Breezecard (BreezecardNum,Value,BelongsTo) VALUES  (?,?,?)",[nrs,0.00,username], function (err, result, fields) {
                if (err) return res.render('register', { title: 'Registration' ,errorsInd:'Invalid Breezecard Add'});
                });
              }
            }
            db.query('SELECT Username as user_id FROM User WHERE Username = (?)',[username], function(error, results, fields){
               if (error) return res.render('register', { title: 'Registration' ,errorsInd:'Invalid Username Selection'});
              const user_id = results[0];
              //console.log(results[0]);
              req.login(user_id, function(err){
              res.redirect('/profile');
            });
          });
          });
        });
        });
    });
  }


  });
});


passport.serializeUser(function(user_id, done) {
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
    done(null, user_id);
});

function authenticationMiddleware(){
  return (req,res,next) => {
    //console.log(req.user.Username);
    if (req.isAuthenticated()) return next(
    );
    res.redirect('/login');
  }
}
module.exports = router;
