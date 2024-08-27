const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
dotenv.config();

const app = express();
app.use(cors()); // Add CORS middleware
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Define the schema
const reportSchema = new mongoose.Schema(
  {
    fileName: String,
    fileFormat: String,
    aggregation: String,
    aggregationColumn: String,
    aggregationCondition: String,
    newColumn: String,
    resultFormat: String,
    report: String,
  },
  { timestamps: true }
); // Add timestamps

const Report = mongoose.model('Report', reportSchema);

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// // Configure multer for file uploads to maongo
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, path.join(__dirname, 'uploads'));
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   },
// });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOADDIRECTORY);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// File upload API
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.send({
    message: 'File uploaded successfully',
    filename: req.file.filename,
  });
});

// File download API to using mongo
// app.get('/api/download/:filename', (req, res) => {
//   const filename = req.params.filename;
//   const filePath = path.join(__dirname, 'uploads', filename);

//   if (fs.existsSync(filePath)) {
//     res.download(filePath, filename, (err) => {
//       if (err) {
//         res.status(500).send({
//           message: 'Could not download the file. ' + err,
//         });
//       }
//     });
//   } else {
//     res.status(404).send({
//       message: 'File not found.',
//     });
//   }
// });
app.get('/api/download/:fileName', (req, res) => {
  const filePath = path.join(
    process.env.DOWNLOADDIRECTORY,
    req.params.fileName
  );
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});
// Your existing Report API...

// POST route
// app.post('/api/reports', async (req, res) => {
//   try {
//     const newReport = new Report(req.body);
//     const savedReport = await newReport.save();
//     res.status(201).json(savedReport);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });
app.post('/api/reports', async (req, res) => {
  try {
    const newReport = new Report(req.body);
    const savedReport = await newReport.save();

    // Define the local directory and file path
    const filePath = path.join(
      process.env.UPLOADDIRECTORY,
      `${req.body.fileName}.json`
    );

    // Convert the saved report to JSON and write it to the file
    fs.writeFile(filePath, JSON.stringify(savedReport, null, 2), (err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: 'Error saving file', error: err.message });
      }

      res.status(201).json({
        message: 'Report saved and file created',
        report: savedReport,
      });
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// GET all reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }); // Sort by creation date, newest first
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get('/api/reports/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;

    // Use findOne instead of findById, and search by fileName
    const report = await Report.findOne({ fileName: fileName });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// // GET a single report by ID
// app.get('/api/reports/:id', async (req, res) => {
//   try {
//     const report = await Report.findById(req.params.id);
//     if (!report) {
//       return res.status(404).json({ message: 'Report not found' });
//     }
//     res.json(report);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
