var express = require('express');
var router = express.Router();
var randomstring = require("randomstring");

//-------------Main Passenger Page to Link off to others----------------


router.get('/users', function (req, res, next) {
  if (req.isAuthenticated()) {
    const db = require('../db.js');
    db.query('SELECT StartsAt From Trip NATURAL JOIN Breezecard WHERE BelongsTo = (?) AND EndsAt IS Null', [req.user.user_id],
    function(err,results,fields) {
      if (err) {
        throw error;
      } else if (!results.length) {
        db.query('SELECT BreezecardNum, Value FROM Breezecard WHERE (Breezecard.BelongsTo=(?) '
          + 'AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict))',
          [req.user.user_id], function (err, results, fields) {
            if (err) throw error;
            var bb = results;
            db.query('SELECT * From Station WHERE (Station.ClosedStatus=0)', function (err, results, fields) {
              if (err) throw error;
              res.render('passenger', { bc: bb, choo: results });
            });
          });
      } else {
        res.redirect('/usersStarted/' + results[0].StartsAt);
      }

    });
  } else {
    res.send('<h1>bad user</h1>')
  }
});
router.get('/usersStarted/:st', function (req, res, next) {
  if (req.isAuthenticated()) {
    const db = require('../db.js');
    db.query('SELECT BreezecardNum, Value FROM Breezecard WHERE (Breezecard.BelongsTo=(?) '
    +'AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict))', 
    [req.user.user_id], function (err, results, fields) {
      if (err) throw error;
      var bb = results;
      var cc = results[0].BreezecardNum;
      console.log(cc)
      db.query('SELECT * From Station WHERE (Station.ClosedStatus=0 AND Station.IsTrain=(SELECT IsTrain FROM Station Where StopId=(?)))', 
      [req.params.st], function (err, results, fields) {
        if (err) throw error;
        var cho = results;
        db.query('SELECT * FROM Station WHERE Station.StopId=(?)',[req.params.st], function(err,results,fields){
          res.render('passenger', { bc: bb, choo: cho, stationLock: results, breeze:cc});

        });
      });
    });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/startTrip/:bc/:st/:ty', function (req, res, next) {
  if (req.isAuthenticated()) {
    const db = require('../db.js');
    var xx = (req.params.st).toString();
    yy = (xx.substring(0,xx.lastIndexOf("-"))).trim();
    zz = (xx.substring(xx.lastIndexOf("$") + 1,xx.length)).trim();
    db.query('SELECT BreezecardNum FROM Breezecard WHERE ((?) Not In (SELECT BreezecardNum FROM Conflict) '
    +'AND (?) <= Breezecard.Value AND (?) NOT IN (SELECT BelongsTo FROM Breezecard NATURAL JOIN Trip WHERE '
    +'EndsAt Is Null) AND (?)=BreezecardNum)', 
    [req.params.bc,zz,req.user.user_id,req.params.bc], function (err, results, fields) {
      if (err) {
        throw error;
      }
      else if (results.length){
        db.query("INSERT INTO Trip (Tripfare,StartTime,BreezecardNum, StartsAt) VALUES ((?), (?), (?), (SELECT StopId FROM Station WHERE Station.Name = (?) AND Station.IsTrain=(?) AND Station.ClosedStatus=0) )", //added AND Station.ClosedStatus=0
        [zz,new Date().toISOString().slice(0, 19).replace('T', ' '),req.params.bc,yy,req.params.ty],function (err,results,fields){
          if(err) {
            res.redirect('/users');
          } else {
            db.query("SELECT StopId FROM Station WHERE (Station.Name = (?) AND Station.IsTrain=(?)) ",[yy,req.params.ty],
            function (err,results,fields){
              if(err) {
                throw error;
              } else {
                var si = results[0].StopId;
                db.query("UPDATE Breezecard SET Value = Value - (?) WHERE BreezecardNum=(?)",[zz,req.params.bc],function (err,results,fields) {
                  if(err) {
                    throw error;
                  } else {
                    res.redirect('/usersStarted/'+ si);

                  }
                });
              }

            });
          }
        });

      } else {
        res.redirect('/users');
      }
      
    });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/endTrip/:st/:ty', function (req, res, next) {
  if (req.isAuthenticated()) {
    const db = require('../db.js');
     db.query("SELECT StopId, ClosedStatus FROM Station WHERE (Station.Name = (?) AND Station.IsTrain=(?)) ",
     [req.params.st,req.params.ty], function (err,results,fields){
       if (err) {
         throw error;
       }
       if (results[0].ClosedStatus) {
         return res.redirect('/users')
       }
       console.log(results[0].StopId)
       var stopI = results[0].StopId;
       db.query('SELECT BreezecardNum From Trip NATURAL JOIN Breezecard WHERE BelongsTo = (?) AND EndsAt IS Null',
       [req.user.user_id], function(err,results, fields){
         if(err) {
           throw error;
         } else {
           console.log(results[0].BreezecardNum)
           db.query("Update Trip SET EndsAt=(?), StartTime=StartTime WHERE Trip.BreezecardNum=(?) AND Trip.EndsAt IS NULL",[stopI,results[0].BreezecardNum],
           function(err,results,fields){
             if(err) {
               throw error
             } else {
               return res.redirect('/users');
             }
           });
           
         }
       });
    });


    

  } else {
    return res.send('<h1>bad user</h1>')
  }
});

//----------------Manage Card Tings-----------------------------------
router.get('/manageCards',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
      db.query('SELECT BreezecardNum,Value FROM Breezecard WHERE (Breezecard.BelongsTo=(?) AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict))',[req.user.user_id],function(err,results,fields){
        if (err) throw error;
        var bb = results;
        res.render('manageCards', { bloop: bb});
      });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/cnasc',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
      db.query('SELECT BreezecardNum,Value FROM Breezecard WHERE (Breezecard.BelongsTo=(?) AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict)) ORDER BY BreezecardNum',[req.user.user_id],function(err,results,fields){
        if (err) throw error;
        var bb = results;
        res.render('manageCards', { bloop: bb});
      });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/cndesc',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
      db.query('SELECT BreezecardNum,Value FROM Breezecard WHERE (Breezecard.BelongsTo=(?) AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict)) ORDER BY BreezecardNum DESC',[req.user.user_id],function(err,results,fields){
        if (err) throw error;
        var bb = results;
        res.render('manageCards', { bloop: bb});
      });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/valueasc',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
      db.query('SELECT BreezecardNum,Value FROM Breezecard WHERE (Breezecard.BelongsTo=(?) AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict)) ORDER BY Value',[req.user.user_id],function(err,results,fields){
        if (err) throw error;
        var bb = results;
        res.render('manageCards', { bloop: bb});
      });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/valuedesc',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
      db.query('SELECT BreezecardNum,Value FROM Breezecard WHERE (Breezecard.BelongsTo=(?) AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict)) ORDER BY Value DESC',[req.user.user_id],function(err,results,fields){
        if (err) throw error;
        var bb = results;
        res.render('manageCards', { bloop: bb});
      });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/manageCardsError',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
      db.query('SELECT BreezecardNum,Value FROM Breezecard WHERE (Breezecard.BelongsTo=(?) AND Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict))',[req.user.user_id],function(err,results,fields){
        if (err) throw error;
        var bb = results;
        res.render('manageCards', { bloop: bb, bad:"Was not Updated. Value must not exceed $1000."});
      });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/removeCard/:bc',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
    console.log(req.params.bc)
      db.query('UPDATE Breezecard SET BelongsTo=NULL WHERE (Breezecard.BreezecardNum=(?))',[req.params.bc],function(err,results,fields){
        if (err) throw error;
        db.query("SELECT COUNT(BelongsTo) AS nc From Breezecard WHERE BelongsTo = (?)",[req.user.user_id],
        function(err, results, fields){
          if(err) {
            throw error;
          } else if (!results[0].nc) {
              var nrs = randomstring.generate({ length: 16, charset: 'numeric' });
            db.query("INSERT INTO Breezecard (BreezecardNum,Value,BelongsTo) VALUES  (?,?,?)", [nrs, 0.00, req.user.user_id], function (err, result, fields) {
              if (err) return res.redirect('/manageCards');
            });
            return res.redirect('/manageCards');

          } else {
            return res.redirect('/manageCards');
          }

        });
      });
  } else {
    res.send('<h1>bad user</h1>')
  }
});

router.get('/addMoney/:bc/:mm',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
    var mm = parseFloat(req.params.mm);
    db.query('UPDATE Breezecard SET Value =Value + (?) WHERE (Breezecard.BreezecardNum=(?) AND Breezecard.Value + (?) <= 1000.00)',[mm,req.params.bc,mm],function(error,results,fields){
      if(error) {
        return res.redirect('/home');
      } else {
        if(parseInt(results.changedRows) === 0) {
          return res.redirect('/manageCardsError');
        }
        console.log(results.changedRows);
        return res.redirect('/manageCards');
      }

    })
  } else {
    return res.send('<h1>bad user</h1>')
  }
});

router.get('/addCard/:bc', function (req, res, next) {
  if (req.isAuthenticated()) {
    const db = require('../db.js');
    console.log(req.params.bc)
    db.query('SELECT BreezecardNum, BelongsTo FROM Breezecard WHERE BreezecardNum = (?)', [req.params.bc], function (error, results, field) {
      if (error) {
        return res.redirect('/manageCards');
      }
      else if (!results.length) {
        db.query("INSERT INTO Breezecard (BreezecardNum,Value,BelongsTo) VALUES  (?,?,?)", [req.params.bc, 0.00, req.user.user_id], function (err, result, fields) {
          if (err) return res.redirect('/manageCards');
          return res.redirect("/manageCards");
        });
      }
      else {
        console.log(results);
        if (results[0].BelongsTo == null) {
          db.query("UPDATE Breezecard SET BelongsTo = (?) WHERE BreezecardNum = (?)", [req.user.user_id, req.params.bc],
            function (err, result, fields) {
              if (err) return res.redirect('/manageCards');
            });
            return res.redirect("/manageCards");
        } else {
          if (results[0].BelongsTo === req.user.user_id) {
            return res.redirect("/manageCards");
          } else {
            db.query("INSERT INTO Conflict (Username,BreezecardNum,DateTime) VALUES  (?,?,?)", [req.user.user_id, req.params.bc, new Date().toISOString().slice(0, 19).replace('T', ' ')], function (err, result, fields) {
              if (err) return res.redirect('/manageCards');
              var nrs = randomstring.generate({ length: 16, charset: 'numeric' });
               db.query("INSERT INTO Breezecard (BreezecardNum,Value,BelongsTo) VALUES  (?,?,?)", [nrs, 0.00, req.user.user_id], function (err, result, fields) {
                  if (err) return res.redirect('/manageCards');
                  return res.redirect('/manageCards');
              });
            });

          }
        }
      }

      //return res.redirect("/manageCards");
    });

  } else {
    res.send('<h1>bad user</h1>')
  }
});

//------------------------------------------
router.get('/viewTripHistory', function (req, res, next) {
  if (req.isAuthenticated()) {
    const db = require('../db.js');
    var x = "SELECT Trip.*,Breezecard.BelongsTo,Station.Name,s.Name as " +
      "ename FROM Trip LEFT OUTER JOIN Station ON Trip.StartsAt = Station.StopID " +
      "LEFT OUTER JOIN Station as s ON Trip.EndsAt = s.StopID LEFT OUTER JOIN Breezecard " +
      "ON Trip.BreezecardNum = Breezecard.BreezecardNum WHERE Breezecard.BelongsTo =(?) AND " +
      "Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) ORDER BY Trip.StartTime";
    db.query(x, [req.user.user_id], function (err, results, fields) {
      if (err) return res.redirect('/users');
      console.log(results)
      return res.render('tripHistory', { bloop: results });
    });
  } else {
    return res.send('<h1>g00d user</h1>')
  }
});

router.get('/viewTripHistory/both/:start/:end',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
    var x = "SELECT Trip.*,Breezecard.BelongsTo,Station.Name,s.Name as "+
    "ename FROM Trip LEFT OUTER JOIN Station ON Trip.StartsAt = Station.StopID "+
    "LEFT OUTER JOIN Station as s ON Trip.EndsAt = s.StopID LEFT OUTER JOIN Breezecard "+ 
    "ON Trip.BreezecardNum = Breezecard.BreezecardNum WHERE Breezecard.BelongsTo =(?) AND " +
    "Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Breezecard.BreezecardNum NOT " +
    "IN (SELECT BreezecardNum FROM Conflict) AND Trip.StartTime >= (?) AND Trip.StartTime <= (?)";
    db.query(x,[req.user.user_id,req.params.start,req.params.end],
    function (err,results,fields){
      if (err) return res.redirect('/users');
      return res.render('tripHistory', { bloop: results});
    });
  } else {
    return res.send('<h1>bad user</h1>')
  }
});

router.get('/viewTripHistory/start/:start',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
    var x = "SELECT Trip.*,Breezecard.BelongsTo,Station.Name,s.Name as "+
    "ename FROM Trip LEFT OUTER JOIN Station ON Trip.StartsAt = Station.StopID "+
    "LEFT OUTER JOIN Station as s ON Trip.EndsAt = s.StopID LEFT OUTER JOIN Breezecard "+ 
    "ON Trip.BreezecardNum = Breezecard.BreezecardNum WHERE Breezecard.BelongsTo =(?) AND " +
    "Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Breezecard.BreezecardNum NOT " +
    "IN (SELECT BreezecardNum FROM Conflict) AND Trip.StartTime >= (?)";
    db.query(x,[req.user.user_id,req.params.start],
    function (err,results,fields){
      if (err) return res.redirect('/users');
      console.log(results)
      return res.render('tripHistory', { bloop: results});
    });
  } else {
    return res.send('<h1>bad user</h1>')
  }
});

router.get('/viewTripHistory/end/:end',function(req, res, next) {
  if(req.isAuthenticated()){
    const db = require('../db.js');
    var x = "SELECT Trip.*,Breezecard.BelongsTo,Station.Name,s.Name as "+
    "ename FROM Trip LEFT OUTER JOIN Station ON Trip.StartsAt = Station.StopID "+
    "LEFT OUTER JOIN Station as s ON Trip.EndsAt = s.StopID LEFT OUTER JOIN Breezecard "+ 
    "ON Trip.BreezecardNum = Breezecard.BreezecardNum WHERE Breezecard.BelongsTo =(?) AND " +
    "Breezecard.BreezecardNum NOT IN (SELECT BreezecardNum FROM Conflict) AND Breezecard.BreezecardNum NOT " +
    "IN (SELECT BreezecardNum FROM Conflict) AND Trip.StartTime <= (?)";
    db.query(x,[req.user.user_id,req.params.end],
    function (err,results,fields){
      if (err) return res.redirect('/users');
      return res.render('tripHistory', { bloop: results});
    });
  } else {
    return res.send('<h1>bad user</h1>')
  }
});

//-----------


router.get('/users/:bc',function(req, res, next) {
  console.log(req.user.user_id);
  if(req.isAuthenticated()){
    res.send('<h1>bad user</h1>');
  } else {
    res.send('<h1>g00d user</h1>')
  }
});

module.exports = router;
