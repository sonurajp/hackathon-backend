const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
const reportSchema = new mongoose.Schema({
  fileName: String,
  fileFormat: String,
  aggregation: String,
  aggregationColumn: String,
  aggregationCondition: String,
  newColumn: String,
  resultFormat: String,
  report: String,
});

const Report = mongoose.model('Report', reportSchema);

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
let uniqueSuffix = '';
let fileExtension = '';
let unique = '';
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.UPLOADDIRECTORY || 'uploads/');
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    uniqueSuffix = crypto.randomBytes(8).toString('hex');
    fileExtension = path.extname(file.originalname);
    unique = file.fieldname + '-' + uniqueSuffix + fileExtension;
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  },
});
const upload = multer({ storage: storage });

// File upload API
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  res.status(200).json({
    message: 'File uploaded successfully',
    originalFilename: req.file.originalname,
    uniqueFilename: req.file.filename,
  });
});

app.get('/api/download/:fileName', async (req, res) => {
  const report = await Report.findOne({ fileName: req.params.fileName });
  const baseFileName = path.parse(report.fileName).name;

  const filePath = path.join(
    process.env.DOWNLOADDIRECTORY,
    `${baseFileName}.${report.resultFormat}`
  );

  if (fs.existsSync(filePath)) {
    res.download(filePath, report.resultFormat);
  } else {
    res.status(404).send('File not found here  at all');
  }
});
app.get('/api/reports/download/:fileName', async (req, res) => {
  const report = await Report.findOne({ fileName: req.params.fileName });
  const baseFileName = path.parse(report.fileName).name;

  const filePath = path.join(
    process.env.DOWNLOADDIRECTORY,
    `${baseFileName}.png`
  );

  if (fs.existsSync(filePath)) {
    res.download(filePath, report.resultFormat);
  } else {
    res.status(404).send('File not found here  at all');
  }
});

// Your existing Report API...

app.post('/api/reports', async (req, res) => {
  try {
    // const newReport = new Report(req.body);
    let reportData = { ...req.body, fileName: unique };
    const newReport = new Report(reportData);
    const savedReport = await newReport.save();
    // Define the local directory and file path
    const baseFileName = path.parse(unique).name;
    const filePath = path.join(
      process.env.UPLOADDIRECTORY,
      `${baseFileName}_aggregation_conditions.json`
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
