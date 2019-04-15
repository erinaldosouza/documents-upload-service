const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer  = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const bodyParser = require('body-parser');
const ObjectId = require('mongodb').ObjectID;

const app = express();

// Middleware
app.use(bodyParser.json());

// Mongo uri
const mongoURI = "mongodb://localhost:27017/test_db";

// Create Mongo connection
const conn = mongoose.createConnection(mongoURI, {useNewUrlParser: true});

// Init gfs
let gfs;

conn.on('error', console.error.bind(console, 'connection error:'));
conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('user_docs');
});

// Create a store object
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if(err) {
                    return reject(err);                    
                }

                const fileName = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    fileName: fileName,
                    bucketName: 'user_docs'
                };

                resolve(fileInfo);
            })
        })
    }
});

const upload = multer({ storage });

// Read all files from MongoDB
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {  
        if(!files || files.lengh === 0) {
            return res.status(404).json({
                err: 'No file found'
            });
        }

        return res.json(files);
    })
});

// Read a specific file from MongoDB
app.get('/:id', (req, res) => {
    gfs.files.findOne({_id: new ObjectId(req.params.id)}, (err, file) => {  
        if(!file || file.lengh === 0) {
            return res.status(404).json({
                err: 'No file found'
            });
        }

        return res.json(file);
    })
});

// display a single file from MongoDB
app.get('/img/:id', (req, res) => {
    gfs.files.findOne({_id: new ObjectId(req.params.id)}, (err, file) => {  
        if(!file || file.lengh === 0) {
            return res.status(404).json({
                err: 'No file found'
            });
        }

        if(file.contentType === "image/jpeg" || file.contentType === "image/png") {
            const readStream = gfs.createReadStream(file.filename);
            readStream.pipe(res);
        } else {
            resizeTo.status(404).json({
                err: 'Not an image'
            })
        }
    })
})

app.post('/', upload.single('file'), (req, res) => {
    res.json({ file: req.file })
    console.log(new Date())
})

app.delete('/:id',  (req, res) => {
    gfs.remove({_id: req.params.id, root: 'user_docs'}, (err, gridStore) => {
         if(err) {
             return err.status(500).json({err: err});
         }

         return res.status(200).json({msg: 'success'})
    })
})
const port = 5000;

app.listen(port, ()=> {
    console.log(`Server started on port ${port}`)
})