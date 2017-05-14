var webSocketServer = require('websocket').server;
var http = require('http');

var SERVER_PORT = 8181;

// array de clientes conectados: (id, username, connection)
var clients = [];

var server = http.createServer(function (req, res) {
    // processa as requisições http do cliente, mas como nós estamos utilizando WebSocket, não será feito nada aqui.
}).listen(SERVER_PORT, function () {
    console.log('[Server started at port]: ' + SERVER_PORT + ' - ' + formatarData(new Date()));
});

// cria websocket server e o amarra ao http server
var wsServer = new webSocketServer({
    httpServer: server
});

// Esse callback é disparado sempre que alguém tenta se conectar ao WebSocket Server
wsServer.on('request', function (req) {

    // socket do cliente
    var clientConnection = req.accept(null, req.origin);

    // adiciona conexão a lista de clientes conectados, e retorna o indice do próximo elemento
    var index = clients.push({ connection: clientConnection }) - 1;

    console.log('[new connection]: ' + index + ' - ' + formatarData(new Date()));

    // evento é disparado, quando o servidor recebe alguma mensagem do cliente
    clientConnection.on('message', function (message) {

        // manipula as mensagens de codificação = 'utf8'        
        processMessage(message);
    });

    // evento disparado, quando o cliente encerra a conexão com o servidor
    clientConnection.on('close', function (connection) {
        close(connection);
    });

    // processa mensagem recebida do cliente
    function processMessage(message) {

        // aceita apenas texto codificado em utf8
        if (message.type === 'utf8') {

            // recupera os dados da mensagem
            var data = JSON.parse(message.utf8Data);

            if (data.type === 'message') { // MENSAGEM

                var msgJSON = {
                    type: 'message',
                    author: clients[index].username,
                    text: htmlEntities(data.message)
                }

                broadcastMessage(msgJSON);

            } else if (data.type === 'login') { // LOGIN

                // mensagem a ser enviada ao cliente
                var msg = {
                    type: 'retLogin'
                }

                // apelido do cliente
                var username = data.message;

                // verifica se o apelido pode ser usado
                if (isUsernameInvalid(username)) {
                    msg.text = '002';
                    console.log('[login invalid]: ' + index + ', user: ' + data.message + '  - ' + formatarData(new Date()));
                } else {

                    // salva apelido do cliente no array de objetos que representa a conexão do cliente 
                    clients[index].username = username;
                    msg.text = '001';

                    console.log('[login valid]: ' + index + ', user: ' + username + ' - ' + formatarData(new Date()));

                    // cria mensagem para notificar novo usuário conectado
                    var msgConnected = {
                        type: 'newUserConnected',
                        data: {
                            id: index,
                            user: username
                        }
                    };

                    // envia mensagem em broadcast: notificando que um novo usuário se conectou
                    setTimeout(() => {
                        broadcastMessage(msgConnected);
                    }, 500);
                }

                // envia mensagem de retorno: notificando que o usuário o login foi realizado
                clientConnection.sendUTF(JSON.stringify(msg));
            }
        }

    }

    /**
     * Envia a mensagem para todos os usuários conectados
     * @param {*} message 
     */
    function broadcastMessage(message) {

        for (i = 0; i < clients.length; i++) {
            clients[i].connection.sendUTF(JSON.stringify(message));
        }

    }

    // encerra a conexão do cliente
    function close(connection) {

        // remove o indice do array, reindexando o array
        var conRemoved = clients.splice(index, 1);
        console.log('[close connection]: ' + index + ' - ' + formatarData(new Date()));
    }

});

function isUsernameInvalid(username) {

    for (i = 0; i < clients.length; i++) {

        if (clients[i].username === username) {
            return true;
            break;
        }
    }

    return false;
}

function formatarData(data) {
    return data.getDate() + '/' + (data.getMonth().toString().length === 1 ? '0' + data.getMonth() : data.getMonth()) + '/' + data.getFullYear() + ' ' + data.getHours() + ':' + data.getMinutes() + ':' + data.getSeconds();
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
