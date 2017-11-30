var express = require('express');
var router = express.Router();
var async = require('async');
var pool = require('../config/dbPool');
var moment = require('moment');

router.post('/client', function(req, res) {
  var user_id = req.body.user_id;
  var object = {
    task_type : req.body.task_type,
    cost : req.body.cost,
    details : req.body.details,
    registertime : moment().format("YYYYMMDDHHmmss"),       //register time
    deadline : req.body.deadline,
    workplace_lat : parseFloat(req.body.workplace_lat),
    workplace_long : parseFloat(req.body.workplace_long),
    workplace_name : parseFloat(req.body.workplace_name),
    home_lat : parseFloat(req.body.home_lat),
    home_long : parseFloat(req.body.home_long),
    home_name : parseFloat(req.body.home_name),
    status : "w"
  };

  if(!(user_id && object.task_type && object.cost && object.details && object.deadline && object.workplace_lat && object.workplace_long && object.workplace_name && object.home_lat && object.home_long && object.home_name)) {
    res.status(500).send({
      status : "fail",
      message : "wrong input"
    });
    console.log("wrong input");
  } else {
    pool.getConnection(function(err, connection) {
      if(err) {
        res.status(500).send({
          status : "fail",
          message : "internal server error : " + err
        });
        console.log("internal server error : " + err);
      } else {
        let user_idxQuery = 'SELECT * FROM user WHERE user_id = ?';
        connection.query(user_idxQuery, user_id, function(err, result) {
          if(err) {
            res.status(500).send({
              status : "fail",
              message : "internal server error : " + err
            });
            console.log("internal server error : " + err);
          } else {
            if(result.length === 0) {
              res.status(500).send({
                status : "fail",
                message : "wrong input"
              });
              console.log("wrong input");
            } else {
              let registerTaskQuery = 'INSERT INTO curr_task (task_type, cost, details, registertime, deadline, workplace_lat, workplace_long, workplace_name, home_lat, home_long, home_name, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
              connection.query(registerTaskQuery, [object.task_type, object.cost, object.details, object.registertime, object.deadline, object.workplace_lat, object.workplace_long, object.workplace_name, object.home_lat, object.home_long, object.home_name, object.status], function(err) {
                if(err) {
                  res.status(500).send({
                    status : "fail",
                    message : "internal server error : " + err
                  });
                  console.log("internal server error : " + err);
                } else {
                  res.status(201).send({
                    status : "success",
                    message : "successfully register current task"
                  });//res.status(201)
                  console.log("successfully register current task");
                }
              });//connection.query(registerTaskQuery)
            }
          }
        });//connection.query
      }
    });//pool.getConnection
  }
  //
  // var sql = 'SELECT from user WHERE user_id =: user_id';
  // db.query(sql, {
  //   params : {
  //     user_id : user_id
  //   }
  // }).then(function(results) {
  //   if(results.length === 0) {
  //     console.log('ERR');
  //   } else {
  //     object.user_idx = results[0].user_idx;
  //     var sql = 'INSERT INTO curr_task (task_type, cost, details, deadline, workplace_lat, workplace_long, workplace_name, home_lat, home_long, home_name, user_idx) VALUES (:task_type, :cost, :details, :deadline, :workplace_lat, :workplace_long, :workplace_name, :home_lat, :home_long, :home_name, :user_idx)';
  //     db.query(sql, {
  //       params : object
  //     }).then(function(results) {
  //       if(results.length === 0) {
  //         console.log('ERR');
  //       } else {
  //         res.writeHead(200, {"Content-Type" : "text/plain"});
  //         res.end(JSON.stringify({
  //           msg: "success",
  //           data: ""
  //         }));//res.end
  //       }
  //     });//db.query('INSERT')
  //   }
  // });//db.query('SELECT')
});//router.post('/client')

function radius_func(a, b, c, d) {
  return Math.sqrt((c - a) * (c - a) + (d - b) * (d - b)) / 2;
}

function middle_point_func(a, b) {
  return (a + b) / 2;
}

function compare_far_point_func(helper_lat, helper_long, client_start_lat, client_start_long, client_end_lat, client_end_long) {
  let start_point = radius_func(helper_lat, helper_long, client_start_lat, client_start_long);
  let end_point = radius_func(helper_lat, helper_long, client_end_lat, client_end_long);
  if(start_point >= end_point)    //start point가 더 멀거나 같을 경우
    return 1;
  else return 0;                  //end point가 더 멀거나 같을 경우
}

router.get('/helper', function(req, res) {
  var home_lat = parseFloat(req.query.home_lat);
  var home_long = parseFloat(req.query.home_long);
  var workplace_lat = parseFloat(req.query.workplace_lat);
  var workplace_long = parseFloat(req.query.workplace_long);
  var user_id = req.query.user_id;
  var middle_lat = (home_lat + workplace_lat) / 2;
  var middle_long = (home_lat + workplace_long) / 2;
  var radius = radius_func(home_lat, home_long, workplace_lat, workplace_long);

  if(!(user_id && home_lat && home_long && workplace_lat && workplace_long)) {
    res.status(500).send({
      status : "fail",
      message : "wrong input"
    });
    console.log("wrong input");
  } else {
    // (***) db get connection 해야한다.
    let distanceCheckQuery = 'SELECT * FROM curr_task WHERE (? * ?) > ((workplace_lat - ?) * (workplace_lat - ?)) + ((workplace_long - ?) * (workplace_long - ?)) '
                                                 + 'AND ? > (? * ?) > ((home_lat - ?) * (home_lat - ?)) + ((home_long - ?) * (home_long - ?)) AND status = ?';
    let radius = radius_func(home_lat, home_long, workplace_lat, workplace_long);
    connection.query(distanceCheckQuery, [radius, radius, middle_lat, middle_lat, middle_long, middle_long, radius, radius, middle_lat, middle_lat, middle_long, middle_long, "w"], function(err, result) {
      if(err) {
        res.status(500).send({
          status : "fail",
          message : "internal server error" + err
        });
        connection.release();
      } else {
        res.status(200).send({
          status : "success",
          message : "successfully search task",
          data : result
        });
        connection.release();
      }
    });//connection.query(distanceCheckQuery)

    // let user_idxQuery = 'SELECT * FROM user WHERE user_id = ?';
    // connection.query(user_idxQuery, user_id, function(err, result) {
    //   if(err) {
    //     res.status(500).send({
    //       status : "fail",
    //       message : "internal server error : " + err
    //     });
    //     console.log("internal server error : " + err);
    //   } else {
    //     if(result.length === 0) {
    //       res.status(500).send({
    //         status : "fail",
    //         message : "there is no id"
    //       });
    //       console.log("no id : " + user_id);
    //     } else {
    //       let user_idx = result[0].user_idx;
    //       middle_x = middle_point_func(home_lat, workplace_lat);
    //       middle_y = middle_point_func(home_long, workplace_long);
    //       //거리 계산해야지
    //       //그 값을 디비에 넣어서 찾고(둘 다 범위 안에 있어야함)
    //       //둘 중에 먼 곳만 배열의 형태로 보내줌
    //
    //     }
    //   }
    // });//connection.query
  }
});//router.get('/helper')

router.put('/matching/waiting/:user_id/:status', function(req, res) {
  let user_id = req.params.user_id;
  let status = req.params.status;

  let taskArray = [
    //1. connection 만들기 함수
    function(callback) {
      if(!(user_id & status) || !(status === "a" || status === "r")) {  //accept / refuse or reject
        res.status(500).send({
          status : "fail",
          message : "wrong input"
        });
        callback("wrong input");
      } else {
        pool.getConnection(function(err, connection) {
          if(err) {
            res.status(500).send({
              status : "fail",
              message : "internal server error : " + err
            });//res.status(500).send
            callback("internal server error : " + err);
          } else {
            callback(null, connection);
          }
        });//pool.getConnection
      }
    },//function(callback)
    //2. select user_idx
    function(connection, callback) {
      let user_idxQuery = 'SELECT * FROM user WHERE user_id = ?';
      connection.query(user_idxQuery, user_id, function(err, result) {
        if(err) {
          res.status(500).send({
            status : "fail",
            message : "internal server error : " + err
          });
          connection.release();
          callback("internal server error : " + err);
        } else {
          callback(null, connection, result[0].user_idx);
        }
      });//connection.query(selectCommentQuery)
    },//function(connection, callback)
    //3. change curr_task DB (Action or Waiting)
    function(connection, user_idx, callback) {
      if(status === "a") {
        let state = "a";
      } else {
        state = "w";
      }
      let updateCurrTaskQuery = 'UPDATE curr_task SET status = ? WHERE helper_user_user_idx = ?';
      connection.query(updateCurrTaskQuery, [state, user_idx], function(err, result) {
        if(err) {
          res.status(500).send({
            status : "fail",
            message : "internal server error : " + err
          });
          connection.release();
          callback("internal server error : " + err);
        } else {
          if(status === "a") {
            res.status(201).send({
              status : "success",
              message : "successfully change task status : Action"
            });
            connection.release();
            callback(null, "successfully change task status : Action");
          } else {
            res.sattus(201).send({
              status : "success",
              message : "successfully change task status : Waiting"
            });
            connection.release();
            callback(null, "successfully change task status : Waiting");
          }
        }
      });//connection.query(updateCurrTaskQuery)
    }//function(connection, user_idx, callback)
  ];

  async.waterfall(taskArray, (err, result) => {
    if(err) console.log(err);
    else console.log(result);
  });//async.waterfall

});//router.get('/matching/waiting/:user_id')

router.put('/matching/:task_idx', function(req, res) {
  let task_idx = req.params.task_idx;

  let taskArray = [
    //1. connection 만들기 함수
    function(callback) {
      if(!(task_idx)) {
        res.status(500).send({
          status : "fail",
          message : "wrong input"
        });
        callback("wrong input");
      } else {
        pool.getConnection(function(err, connection) {
          if(err) {
            res.status(500).send({
              status : "fail",
              message : "internal server error : " + err
            });//res.status(500).send
            callback("internal server error : " + err);
          } else {
            callback(null, connection);
          }
        });//pool.getConnection
      }
    },//function(callback)
    //2. select user_idx
    function(connection, callback) {
      let changeCurrTaskQuery = 'UPDATE curr_task SET status = ? WHERE task_idx = ?';
      connection.query(changeCurrTaskQuery, ["c", task_idx], function(err, result) {
        if(err) {
          res.status(500).send({
            status : "fail",
            message : "internal server error : " + err
          });
          connection.release();
          callback("internal server error : " + err);
        } else {
          if(!result.changedRows) {
            res.status(500).send({
              status : "fail",
              message : "Wrong input : task_idx"
            });
            connection.release();
            callback("Wrong input : task_idx");
          } else {
            res.status(201).send({
              status : "success",
              message : "successfully change task status"
            });
            connection.release();
            callback("successfully change task status");
          }
        }
      });//connection.query(changeCurrTaskQuery)
    }//function(connection, callback)
  ];

  async.waterfall(taskArray, (err, result) => {
    if(err) console.log(err);
    else console.log(result);
  });//async.waterfall

});

router.get('/comments', function(req, res) {
  let user_id = req.query.user_id;
  let status = req.query.status;

  let taskArray = [
    //1. connection 만들기 함수
    function(callback) {
      if(!(user_id & status) || !(status === "client" || status === "helper")) {
        res.status(500).send({
          status : "fail",
          message : "wrong input"
        });
        callback("wrong input");
      } else {
        pool.getConnection(function(err, connection) {
          if(err) {
            res.status(500).send({
              status : "fail",
              message : "internal server error : " + err
            });//res.status(500).send
            callback("internal server error : " + err);
          } else {
            callback(null, connection);
          }
        });//pool.getConnection
      }
    },//function(callback)
    //2. select user_idx
    function(connection, callback) {
      let user_idxQuery = 'SELECT * FROM user WHERE user_id = ?';
      connection.query(user_idxQuery, user_id, function(err, result) {
        if(err) {
          res.status(500).send({
            status : "fail",
            message : "internal server error : " + err
          });
          connection.release();
          callback("internal server error : " + err);
        } else {
          callback(null, connection, result[0].user_idx);
        }
      });//connection.query(selectCommentQuery)
    },//function(connection, callback)
    //3. opponent's user_idx
    function(connection, user_idx, callback) {
      if(status === "client") {
        let findOpponentIndexQuery = 'SELECT helper_user_user_idx FROM curr_task WHERE client_user_user_idx = ?';
      } else {
        let findOpponentIndexQuery = 'SELECT client_user_user_idx FROM curr_task WHERE helper_user_user_idx = ?';
      }
      connection.query(findOpponentIndexQuery, user_idx, function(err, result) {
        if(err) {
          res.status(500).send({
            status : "fail",
            message : "internal server error : " + err
          });
          connection.release();
          callback("internal server error : " + err);
        } else {
          callback(null, connection, user_idx, result[0]);
        }
      });//conection.query(findOpponentIndexQuery)
    },
    //4. get detail opponent's history
    function(connection, user_idx, opponent, callback) {
      if(status === "client") {
        let opponent_index = opponent.helper_user_user_idx;
        let selectRatingCommentQuery = 'SELECT rating_h, comment_h FROM past_task WHERE helper_user_user_idx = ?';
      } else {
        let opponent_index = opponent.client_user_user_idx;
        let selectRatingCommentQuery = 'SELECT rating_c, comment_c FROM past_task WHERE client_user_user_idx = ?';
      }
      connection.query(selectRatingCommentQuery, opponent_index, function(err, result) {
        if(err) {
          res.status(500).send({
            status : "fail",
            message : "internal server error : " + err
          });
          callback("internal server error : " + err);
        } else {
          res.status(200).send({
            status : "success",
            message : "successfully get data",
            data : result
          });
          callback(null, "successfully get data");
        }
        connection.release();
      });//connection.query(selectClientCommentQuery)
    }
  ];

  async.waterfall(taskArray, (err, result) => {
    if(err) console.log(err);
    else console.log(result);
  });//async.waterfall

});//router.get('/comment')

router.delete('/cancel', function(req, res) {
  let user_id = req.query.id;
  let status = req.query.status;

  let taskArray = [
    //1. connection 만들기 함수
    function(callback) {
      if(!(user_id & status) || !(status === "client" || status === "helper")) {
        res.status(500).send({
          status : "fail",
          message : "wrong input"
        });
        callback("wrong input");
      } else {
        pool.getConnection(function(err, connection) {
          if(err) {
            res.status(500).send({
              status : "fail",
              message : "internal server error : " + err
            });//res.status(500).send
            callback("internal server error : " + err);
          } else {
            callback(null, connection);
          }
        });//pool.getConnection
      }
    },//function(callback)
    //2. select user_idx
    function(connection, callback) {
      let user_idxQuery = 'SELECT * FROM user WHERE user_id = ?';
      connection.query(user_idxQuery, user_id, function(err, result) {
        if(err) {
          res.status(500).send({
            status : "fail",
            message : "internal server error : " + err
          });
          connection.release();
          callback("internal server error : " + err);
        } else {
          callback(null, connection, result[0].user_idx);
        }
      });//connection.query(selectCommentQuery)
    },//function(connection, callback)
    //3. delete specific data with user_idx
    function(connection, user_idx, callback) {
      if(status === "client") {
        let deleteTaskQuery = 'DELETE FROM curr_task WHERE client_user_user_idx = ?';
      } else {
        let deleteTaskQuery = 'DELETE FROM curr_Task WHERE helper_user_user_idx = ?';
      }
      connection.query(deleteTaskQuery, user_idx, function(err, result) {
        if(err) {
          res.status(500).send({
            status : "fail",
            message : "internal server error : " + err
          });
          connection.release();
          callback("internal server error : " + err);
        } else {
          res.status(201).send({
            status : "success",
            message : "successfully delete data"
          });
          connection.release();
          callback("successfully delete data");
        }
      });//connection.query(deleteTaskQuery)
    }
  ];

  async.waterfall(taskArray, (err, result) => {
    if(err) console.log(err);
    else console.log(result);
  });//async.waterfall

});//rouer.get('/cancel')

router.post('/star', function(req, res) {
  let status = req.body.status; // client or helper
  let user_id = req.body.user_id;
  var object = {
    rating : req.body.rating,
    comments : req.body.comments
  };

  let taskArray = [
   //1. connection 만들기 함수
   function(callback) {
     if(!(status && object.rating && task_idx)) {
       res.status(500).send({
         status : "fail",
         message : "wrong input"
       });
       callback("wrong input")
     } else if(status === "client" || status === "helper") {
       res.status(500).send({
         status : "fail",
         message : "wrong input"
       });
       callback("wrong input");
     } else {
       pool.getConnection(function(err, connection) {
         if(err) {
           res.status(500).send({
             status : "fail",
             message : "internal server error : " + err
           });//res.status(500).send
           callback("internal server error : " + err);
         } else {
           callback(null, connection);
         }
       });//pool.getConnection
     }
   },//function(callback)
   //2.1 mysql 로 user_idx 가져오기
   function(connection, callback) {
     let user_idxQuery = 'SELECT * FROM user WHERE user_id = ?';
     connection.query(user_idxQuery, user_id, function(err, result) {
       if(err) {
         res.status(500).send({
           status : "fail",
           message : "internal server error : " + err
         });
         connection.release();
         callback("internal server error : " + err);
       } else {
         callback(null, connection, result[0].user_idx);
       }
     });//connection.query(selectCommentQuery)
   },//function(connection, callback)
   //2-2. mysql query(user_idx로 current task table 가져와야함)
   function(connection, user_idx, callback) {
     if(status === "client") {
       let searchCurrTaskQuery = 'SELECT * FROM curr_task WHERE client_user_user_idx = ?';
     } else {
       let searchCurrTaskQuery = 'SELECT * FROM curr_task WHERE helper_user_user_idx = ?';
     }

     connection.query(searchCurrTaskQuery, task_idx, function(err, result) {
       if(err) {
         res.status(500).send({
           status : "fail",
           message : "internal server error : " + err
         });
         connection.release();
         callback("internal server error : " + err);
       } else {
         if(result.length === 0) {
           res.status(500).send({             //user_id가 잘못 되었을 경우
             status : "fail",
             message : "wrong user id"
           });
           connection.release();
           callback("wrong user id");
         } else { //successfully search all in curr_task
           callback(null, connection, result[0]);
         }
       }
     });//connection.query(searchPastTaskQuery)
   },
   //3. curr_task 별점과 코멘트 입력
   function(connection, data, callback) {
     if(data.status === "a") {
       if(status === "client") {
         let updateTaskQuery = 'UPDATE curr_task SET rating_h = ?, comment_h = ?, status = ? WHERE task_idx = ?';
         connection.query(updateTaskQuery, [object.rating, object.comments, "s", data.task_idx], function(err, result) {
           if(err) {
             res.status(500).send({
               status : "fail",
               message : "internal server error : " + err
             });
             connection.release();
             callback("internal server error : " + err);
           } else {
             callback(null, connection, helper_idx, status);
           }
         });//connection.query(updateTaskQuery)
       } else {
         let updateTaskQuery = 'UPDATE curr_task SET rating_c = ?, comment_c = ?, status = ? WHERE task_idx = ?';
         connection.query(updateTaskQuery, [object.rating, object.comments, "s", data.task_idx], function(err, result) {
           if(err) {
             res.status(500).send({
               status : "fail",
               message : "internal server error : " + err
             });
             connection.release();
             callback("internal server error : " + err);
           } else {
             callback(null, connection, client_idx, status);
           }
         });//connection.query(updateTaskQuery)
       }
     } else {
       if(status === "client") {
         let updateTaskQuery = 'UPDATE curr_task SET rating_h = ?, comment_h = ?, status = ? WHERE task_idx = ?';
         connection.query(updateTaskQuery, [object.rating, object.comments, "f", data.task_idx], function(err, result) {
           if(err) {
             res.status(500).send({
               status : "fail",
               message : "internal server error : " + err
             });
             connection.release();
             callback("internal server error : " + err);
           } else {
             callback(null, connection, helper_idx, status);
           }
         });//connection.query(updateTaskQuery)
       } else {
         let updateTaskQuery = 'UPDATE curr_task SET rating_c = ?, comment_c = ?, status = ? WHERE task_idx = ?';
         connection.query(updateTaskQuery, [object.rating, object.comments, "f", data.task_idx], function(err, result) {
           if(err) {
             res.status(500).send({
               status : "fail",
               message : "internal server error : " + err
             });
             connection.release();
             callback("internal server error : " + err);
           } else {
             callback(null, connection, client_idx, status);
           }
         });//connection.query(updateTaskQuery)
       }
     }
   },
   //4. 상대방의 별점횟수와 별점 select
   function(connection, idx, status, callback) {
     if(status === "client") {
       let selectOpponentQuery = 'SELECT rating, count FROM helper WHERE user_user_idx = ?';
     } else {
       let selectOpponentQuery = 'SELECT rating, count FROM client WHERE user_user_idx = ?';
     }

     connection.query(selectOpponentQuery, idx, function(err, result) {
       if(err) {
         res.status(500).send({
           status : "fail",
           message : "internal server error : " + err
         });
         connection.release();
         callback("internal server error : " + err);
       } else {
         var rating = result[0].rating;
         var count = result[0].count;
         callback(null, connection, idx, rating, count, status);
       }
     });//connection.query(selectOpponentQuery)
   },//function(connection, idx, callback)
   //5. 별점과 횟수 추가해서 update
   function(connection, idx, rating, count, status, callback) {
     if(status === "client") {
       let updateOpponentQuery = 'UPDATE helper SET rating = ?, count = ? WHERE user_user_idx = ?';
     } else {
       let updateOpponentQuery = 'UPDATE client SET rating = ?, count = ? WHERE user_user_idx = ?';
     }
     connection.query(updateOpponentQuery, [((rating * count) + object.rating) / (count + 1), count + 1, idx], function(err, result) {
       if(err) {
         res.status(500).send({
           status : "fail",
           message : "internal server error : " + err
         });
         connection.release();      //(***) 한번만 써도 되겠지?
         callback("internal server error : " + err);
       } else {
         if(result.changedRows != 1) {
           res.status(400).send({         // 잘못된 값이 넘어와서 제대로 수정이 되지 않은 경우
             status : "fail",
             message : "there is no change"
           });
           connection.release();      //(***) 한번만 써도 되겠지?
           callback("there is no change");
         } else {

           callback(null, connection, status);
         }
       }
     });//connection.query(updateOpponentQuery)
   },//function(connection, idx, rating, count, callback)
   function(connection, status, callback) {         //만약 두 사람이 다 별점을 입력하였을 경우 past task로 옮김
     if(status != "f") {
       res.status(201).send({
         status : "success",
         message : "successfully update topic"
       });
       connection.release();
       callback(null, "successfully update topic");
     } else {
       let allDoneQuery = 'SELECT * FROM curr_task WHERE task_idx = ?';
       connection.query(allDoneQuery, task_idx, function(err, result) {
         if(err) {
           res.status(500).send({
             status : "fail",
             message : "internal server error : " + err
           });
           connection.release();      //(***) 한번만 써도 되겠지?
           callback("internal server error : " + err);
         } else {
           let object = {
             task_idx : result[0].task_idx,
             task_type : result[0].task_type,
             cost : result[0].cost,
             details : result[0].details,
             workplace_lat : result[0].workplace_lat,
             workplace_long : result[0].workplace_long,
             workplace_name : result[0].workplace_name,
             home_lat : result[0].home_lat,
             home_long : result[0].home_long,
             home_name : result[0].home_name,
             client_user_user_idx : result[0].client_user_user_idx,
             helper_user_user_idx : result[0].helper_user_user_idx,
             comment_h : result[0].comment_h,
             comment_c : result[0].comment_c,
             rating_h : result[0].rating_h,
             rating_c : result[0].rating_c,
           }
           let insertPastTaskQuery = 'INSERT INTO curr_task (task_idx, task_type, cost, details, workplace_lat, workplace_long, workplace_name, home_lat, home_long, home_name, client_user_user_idx, helper_user_user_idx, comment_h, comment_c, rating_h, rating_c) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
           connection.query(insertPastTaskQuery, [object.task_idx, object.task_type, object.cost, object.details, object.workplace_lat, object.workplace_long, object.workplace_name, object.home_lat, object.home_long, object.home_name, object.client_user_user_idx, object.helper_user_user_idx, object.comment_h, object.comment_c, object.rating_h, object.rating_c], function(err, result) {
             if(err) {
               res.status(500).send({
                 status : "fail",
                 message : "internal server error : " + err
               });
               connection.release();      //(***) 한번만 써도 되겠지?
               callback("internal server error : " + err);
             } else {
               let deleteQuery = 'DELETE FROM curr_task WHERE task_idx = ?';
               connection.query(deleteQuery, task_idx, function(err, result) {
                 if(err) {
                   res.status(500).send({
                     status : "fail",
                     message : "internal server error : " + err
                   });
                   connection.release();
                   callback("internal server error : " + err);
                 } else {
                   res.status(201).send({
                     status : "success",
                     message : "successfully update topic & delete curr_task"
                   });
                   connection.release();
                   callback(null, "successfully update topic & delete curr_task");
                 }
               });//connection.query(deleteQuery)
             }
           });//connection.query(insertPastTaskQuery)
         }
       });//connection.query(allDoneQuery)
     }
   }//function(connection, status, callback)
 ];

 async.waterfall(taskArray, (err, result) => {
   if(err) console.log(err);
   else console.log(result);
 });//async.waterfall
});

module.exports = router;
