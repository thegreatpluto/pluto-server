import chalk from 'chalk'
import mysql from 'mysql'

export default ({ io }) => {

  let connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : '',
    database : 'watchviapluto'
  });
  connection.connect();

  io.on(`connection`, socket => {

    /* Getting user information from client */
    let userName = socket.handshake.query.username
    let room = socket.handshake.query.room

    /* MYSQL Connection Test */
    let currentDate = new Date()
    let day = currentDate.getDate()
    let month = currentDate.getMonth() + 1
    let year = currentDate.getFullYear()

    
    connection.query("SELECT * FROM rooms WHERE room='"+room+"'", (error, results, fields) => {
      if(results.length > 0){
        console.log('room already exist, sending initial room data to client!')
        socket.emit('initialroomdata', results[0])
      }else {
        let sql  = {room: room, video: '', current_time: '0', created_by: userName, date_created: day+'-'+month+'-'+year};
        connection.query('INSERT INTO rooms SET ?', sql,  (error, results, fields) => {
          console.log('new room added: '+ room)
        });
      }
    });
    
    /* Join Room*/ 
    socket.join(room);

    /* User connected room send info */
    socket.broadcast.to(room).emit('updatechat', userName,' has connected to this room');

    /* A user changed video */
    socket.on('changevideo', function (videoId) {
      connection.query('UPDATE rooms SET ? WHERE room = ?', [{ video: videoId, current_time: 0, updated_by: userName }, room],  (error, results, fields) => {
        console.log('room video updated to: '+ videoId + ' by '+ userName)
      })
      io.sockets.in(room).emit('videochanged', videoId);
      socket.broadcast.to(room).emit('updatechat', userName,' changed the video');
    });

    /* A user seeked video */
    socket.on('seeked', function (currentTime) {
        console.log(currentTime)
        io.sockets.in(room).emit('videoseeked', currentTime);
        socket.broadcast.to(room).emit('updatechat', userName,' seeked the video');
    });

    /* A user played video */
    socket.on('play', function (played) {
        io.sockets.in(room).emit('videoplayed', played);
        //socket.broadcast.to(room).emit('updatechat', userName,' played the video');
    });

    /* A user paused video */
    socket.on('pause', function (paused) {
        io.sockets.in(room).emit('videopaused', paused);
        //socket.broadcast.to(room).emit('updatechat', userName,' paused the video');
    });

    /* User When Disconnected */
    socket.on('disconnect', () => {
      if(!io.sockets.adapter.rooms[room]){
        console.log('this is the last user of this room send his data to mysql');
      }
      socket.leave(room)
      io.sockets.in(room).emit('updatechat', userName,' has disconnected to this room');
    })


  })
}
