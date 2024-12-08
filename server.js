//require our websocket library 
var WebSocketServer = require('ws').Server;

//creating a websocket server at port 9090 
var wss = new WebSocketServer({ port: process.env.PORT || 4700 });

//all connected to the server users
var users = {};

//when a user connects to our sever 
wss.on('connection', function (connection) {
    console.log("user connected");

    //when server gets a message from a connected user 
    connection.on('message', function (message) {

        var data;
        //accepting only JSON messages 
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        //switching type of the user message 
        switch (data.type) {

            //when a user tries to login 
            case "login":
                //if anyone is logged in with this username then refuse 
                if (users[data.name]) {
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                    console.log("login failed for:", data.name);
                } else {
                    //save user connection on the server 
                    users[data.name] = connection;
                    connection.name = data.name;
                    console.log('users: ', users);
                    sendTo(connection, {
                        type: "login",
                        success: true
                    });
                }

                break;

            case "offer": // offer from user A to a user B
                //for ex. UserA wants to call UserB 
                console.log("Sending offer to: ", data.name);

                //if UserB exists then send him offer details 
                var conn = users[data.name];

                if (conn != null) {
                    //setting that UserA connected with UserB 
                    connection.otherName = data.name;

                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    });

                    console.log("Offer anwsered by: ", data.name);
                } else {
                    console.log("Offer not anwsered, user doesn't exists.");
                }
                break;

            case "answer":
                console.log("Sending answer to: ", data.name);

                //for ex. UserB answers UserA 
                var conn = users[data.name];

                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer
                    });
                }

                break;

            case "candidate":
                console.log("Sending candidate to:", data.name);
                var conn = users[data.name];

                if (conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }

                break;

            case "leave":
                console.log("Disconnecting from", data.name);
                var conn = users[data.name];

                if (conn != null) {
                    conn.otherName = null;

                    //notify the other user so he can disconnect his peer connection 

                    sendTo(conn, {
                        type: "leave"
                    });
                }


                break;

            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command no found: " + data.type
                });

                break;
        }

    });


    connection.on("close", function () {
        if (connection.name) {
            console.log('Connection close for: ', connection.name);
            delete users[connection.name];
        }

        if (connection.otherName) {
           
            var conn = users[connection.otherName];        

            if (conn != null) {
                conn.otherName = null;
                sendTo(conn, {
                    type: "leave"
                });
            }
        }
    });

    connection.send(JSON.stringify("Hello from server"));
});


function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}