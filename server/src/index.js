import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);
const PORT = process.env.PORT || 8080;

app.get('/healthz', (_,res)=>res.send('ok'));
app.use(express.static(path.join(__dirname,'..','public')));
app.get('*',(req,res)=>{
  res.sendFile(path.join(__dirname,'..','public','index.html'));
});
server.listen(PORT, ()=>console.log('Server on http://localhost:'+PORT));
