var connection = new WebSocket('ws://localhost:3434/peer/rtc/connection'); 
var myName = "";
let receivedChunks = [];
let totalSize = 0;

//Recogemos los elementos html
var loginInput  = document.getElementById("loginInput")
var loginBtn = document.getElementById("loginBtn")

var logoutInput  = document.getElementById("logoutInput")
var logoutBtn = document.getElementById("logoutBtn")

var otherUsernameInput = document.getElementById('otherUsernameInput'); 
var connectToOtherUsernameBtn = document.getElementById('connectToOtherUsernameBtn'); 

var msgInput = document.getElementById('msgInput'); 
var sendMsgBtn = document.getElementById('sendMsgBtn'); 

var customMsgInput = document.getElementById('customMsgInput'); 
var sendCustomMsgBtn = document.getElementById('sendCustomMsgBtn'); 

var peerMessagesTextArea = document.getElementById('msgOutput'); 

var fileInput = document.getElementById('fileInput'); 
var sendFileBtn = document.getElementById('sendFileBtn'); 


var myUser, connectedUser, myConnection, dataChannel;

connection.onopen = function () {
    console.log("Conectados al servidor reactivo de spring")
}

connection.onclose = function (event) {
    console.log("Desconectando del servidor de señalizacion");
    console.log('Conexión cerrada');
    console.log('Código de cierre:', event.code);
    console.log('Motivo del cierre:', event.reason);
    console.log('¿Conexión cerrada por el servidor?', event.wasClean);
}

connection.onerror = function (err) {
    console.log("Ha ocurrido un error al conectarnos al servidor: ", err)
}

//Los mensajes siempre estan en formato json
//Reaccionamos a todos los posibles mensajes que nos puede llegar del servidor
connection.onmessage = function (message) {
    var data = JSON.parse(message.data); 
    console.log("Mensaje del signalling server: ", data)
    
    switch (data.type) {
        case "login":
            onLogin(data)
            break;
        case "offer":
            onOffer(data.content, data.from)
            break;
        case "answer":
            onAnswer(data.content)
            break;
        case "candidate":
            onCandidate(data.content);
            break;
    
        default:
            break;
    }

}

//Evento click del boton de login
loginBtn.addEventListener("click", function (event) {
    myName = loginInput.value;
    logoutInput.value = myName;

    //Comprueba si el nombre de usuario es valido y realiza un login
    if (myName.length > 0) {
        myUser = myName;
        send({
            type:"login",
            identifier: myName
        });
    }
});

//Evento click del boton de logout
logoutBtn.addEventListener("click", function (event) {
    myName = logoutInput.value;

    //Comprueba si el nombre de usuario es valido y realiza un logout
    if (myName.length > 0) {
        

        message = JSON.stringify({
            type:"logout",
            identifier: myName
        });
        console.log(message)
        connection.send(message);
        
    }
});

//Evento click del boton de send custom message
sendCustomMsgBtn.addEventListener("click", function (event) {
    message = customMsgInput.value;

    //Comprueba si el nombre de usuario es valido y realiza un logout
    if (message.length > 0) {
        
        sendRawMesage(message);
    }
});

//Establecemos conexion con otro dispositivo
connectToOtherUsernameBtn.addEventListener("click", function (){
    
    var otherUserName = otherUsernameInput.value;
    connectedUser = otherUserName;

    if (otherUserName.length > 0) {

        //Le hacemos una oferta al otro usuario
        myConnection.createOffer(function (offer) {
            console.log();
            send({
                type: "offer",
                offer: offer
            })

            myConnection.setLocalDescription(offer);
        }, function (err) {
            alert("Ha ocurrido un error al enviar la oferta: ")
        })
    }

});

sendMsgBtn.addEventListener("click", function (event) {
    console.log("Enviando mensaje...");

    message = JSON.stringify({type: "text", value: msgInput.value})
    dataChannel.send(message);
})

sendFileBtn.addEventListener("click", function (event) {
    console.log("Enviando fichero...");
    var file = fileInput.files[0];
    var filename = file.name
   var extension = file.type

    //Dividimos el archivo en pequeñas partes 
    console.log("Tipo del fichero: " + file.type)

    sendFile(file,filename, extension)
})

//Mensaje recibido de tipo "login"
function onLogin(data){

    if (data.staus === false) {
        alert("ooops...el usuario ya existe, elige otro")
    } else {
        //Si el usuario se ha registrado correctamente creamos un RTCPeerConnection object
        
        //ICE Candidates
        var rtcConfig  = {
            iceServers : [
                {urls: [
                    "stun:stun.1.google.com:19302",
                    "stun:stun.1.google.com:19303",
                    "stun:stun.1.google.com:19304",
                    "stun:stun.1.google.com:19305"
                ]}
            ],
        };

        myConnection = new RTCPeerConnection(rtcConfig)

        console.log("RTCPeerConnection creado")
        //console.log(myConnection)

        //Seteamos la propiedad oniceCandidate para nuestro RTCPeerConnection.
        //De esta forma siempre que ocurra este evento se ejecutara la siguiente funcion
        //cuando el navegador encuentra un ice candidate lo envia a otro peer
        myConnection.onicecandidate = function (event) {

            if(event.candidate){
                send({
                    type: "candidate",
                    candidate: event.candidate
                })
            }
        }

        myConnection.oniceconnectionstatechange = function() {
            console.log('Estado de la conexión ICE:', myConnection.iceConnectionState);
        
            if (myConnection.iceConnectionState === 'connected') {
                alert('Conexión establecida con éxito con el dispositivo: ' + connectedUser + ' 🎉');
            }
        };

        //Iniciamos el canal de comunicacion
        openDataChannel();

        //Obtenemos el data channel
        getDataChannel();

    }
}


//Funcion que maneja una oferta recibida por otro usuario
function onOffer(offer, name) {
    connectedUser = name;
    myConnection.setRemoteDescription(new RTCSessionDescription(offer))

    myConnection.createAnswer(function (answer) {
        myConnection.setLocalDescription(answer);

        send({
            type:"answer",
            answer:answer
        });

    }, function (err) {
        alert("oppps, error al manejar la oferta recibida")
    });    
}


//Funcion para manejar un mensaje de tipo answer de un peer
function onAnswer(answer) {
    myConnection.setRemoteDescription(new RTCSessionDescription(answer))
}


function onCandidate(candidate) {
    myConnection.addIceCandidate(new RTCIceCandidate(candidate))
}

//Funcion para enviar los mensajes en JSON al servidor de señalizacion
function send(message) { 
   
    if (connectedUser) { 

       message.from = myUser; 
       message.to = connectedUser; 
       
    }
     message = JSON.stringify(message);
     console.log(message);
    connection.send(message); 
};

//Funcion para enviar los mensajes en cualquier formato al servidor de señalizacion
function sendRawMesage(message) { 

    if (connectedUser) { 
        message = JSON.stringify(message);
    }
    connection.send(message); 
};


//Creamos un data channel
function openDataChannel() {
    var dataChannelOptions = {
        reliable:true
    };


    dataChannel = myConnection.createDataChannel("myDataChannel", dataChannelOptions);


    dataChannel.onerror = function (err) {
        console.log("Error creando data channel: ", err)
    }

    //Imprimimos el mensaje por consola
    dataChannel.onmessage  = function (event) {
        console.log("Mensaje recibido: ", event.data);
        message = JSON.parse(event.data)

        //Para texto plano
        if (message.type === "text") {
            peerMessagesTextArea.value = peerMessagesTextArea.value += message.value + '\n';
        }

        //Para ficheros
        if (message.type === "file") {
            // Convertir el valor Base64 de vuelta a ArrayBuffer
            const arrayBuffer = base64ToArrayBuffer(message.value);
            
            // Agregar el chunk recibido al array
            receivedChunks.push(arrayBuffer);
            totalSize += arrayBuffer.byteLength; // Actualizar el tamaño total

            // Si es el último chunk, ensamblar el archivo
            if (message.isLastChunk) {
                console.log("Se recibió el último chunk. Reconstruyendo el archivo...");
                const finalFile = assembleFile(receivedChunks, totalSize);
                downloadFile(finalFile, message.name); // Nombre del archivo
                
            }
        }

        
    }


// Función para convertir Base64 a ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer; // Devuelve un ArrayBuffer
}

// Función para ensamblar los chunks en un Blob
function assembleFile(chunks, totalSize) {
    const combinedBuffer = new Uint8Array(totalSize);
    let offset = 0;

    // Copiar todos los chunks al buffer combinado
    for (const chunk of chunks) {
        combinedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }

    // Crear un Blob a partir del buffer combinado
    return new Blob([combinedBuffer], { type: "application/octet-stream" }); // Puedes cambiar el tipo MIME si conoces el tipo del archivo
}

// Función para descargar el archivo
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename; // Nombre del archivo que se descargará
    document.body.appendChild(a);
    a.click(); // Simular clic para descargar
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Liberar la URL del blob
}


}

function getDataChannel() {
    myConnection.ondatachannel = function(event) {
        //Si no recuperamos el data channel los eventos asociados no funcionaran ya que no sabra cual es el
        //datachannel
        dataChannel = event.channel; 
    };
}

// Función para enviar un archivo, el parametro file representa el
//archivo cargado desde el input file
function sendFile(file, name, extension) {
    
    parseFileAsBytes(file,name, extension, (e) => dataChannel.send(e) )
    //parseFile(file, (e) => dataChannel.send(e))
    
    //Condiguracion del tamaño del buffer del canal
    //dataChannel.bufferedAmountLowThreshold = CHUNK_SIZE * 2; // Ajustar el umbral
    //dataChannel.onbufferedamountlow = function() {};
}


function parseFileAsBytes(file,name, extension, callback) {
    var fileSize = file.size;
    var chunkSize = 32 * 1024; // 32 KB
    var offset = 0; // Inicializar el offset
    var self = this; // Se necesita una referencia al objeto actual
    var chunkReaderBlock = null;

    var readEventHandler = function(evt) {
        // Si no hay ningún error, enviamos los datos
        if (evt.target.error == null) {
            const arrayBuffer = evt.target.result; // Obtener el ArrayBuffer
            const uint8Array = new Uint8Array(arrayBuffer); // Convertir a Uint8Array
            
            // Convertir el Uint8Array a un string Base64
            const base64String = arrayBufferToBase64(uint8Array);

            // Crear el mensaje JSON
            const message = JSON.stringify({
                type: "file",
                name : name,
                extension : extension,
                value: base64String, // Usar la representación en Base64
                isLastChunk: offset + uint8Array.length >= fileSize // Marcar si es el último chunk
            });

            console.log("Enviando chunk...", message);
            callback(message); // Callback para manejar el chunk leído

            // Actualizar el offset después de enviar el chunk
            offset += uint8Array.length; // Actualizar el offset aquí

            // Comprobar si hemos terminado de leer el archivo
            if (offset >= fileSize) {
                console.log("Done reading file");
                return;
            }

            // Ir al siguiente chunk
            chunkReaderBlock(offset, chunkSize, file);
        } else {
            console.log("Read error: " + evt.target.error);
            return;
        }
    }

    chunkReaderBlock = function(_offset, length, _file) {
        var r = new FileReader();
        var blob = _file.slice(_offset, length + _offset);
        r.onload = readEventHandler;
        r.readAsArrayBuffer(blob); // Cambiar a readAsArrayBuffer para leer los bytes
    }

    // Ahora empezamos la lectura con el primer bloque
    chunkReaderBlock(offset, chunkSize, file);
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary); // Convertir a Base64
}


//Este metodo envia el fichero correctamente pero lo envia en formato texto,
//en otras palabras lee el contenido no envia los bytes
function parseFile(file, callback) {
    var fileSize   = file.size;
    var chunkSize  = 32 * 1024; // bytes
    var offset     = 0;
    var self       = this; // we need a reference to the current object
    var chunkReaderBlock = null;

    var readEventHandler = function(evt) {
        //Si no hay ningun error enviamos los datos
        if (evt.target.error == null) {
            offset += evt.target.result.length;
            console.log("Enviando chunk..." + evt.target.result)
            callback(evt.target.result); // callback for handling read chunk
        } else {
            console.log("Read error: " + evt.target.error);
            return;
        }
        if (offset >= fileSize) {
            console.log("Done reading file");
            return;
        }

        // of to the next chunk
        chunkReaderBlock(offset, chunkSize, file);
    }

    chunkReaderBlock = function(_offset, length, _file) {
        var r = new FileReader();
        var blob = _file.slice(_offset, length + _offset);
        r.onload = readEventHandler;
        r.readAsText(blob);
    }

    // now let's start the read with the first block
    chunkReaderBlock(offset, chunkSize, file);
}