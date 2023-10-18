const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const path = require('path');

// Starter Code Setup
const SPREADSHEET_ID = '1k_uKa-tBHvivgevU6arK0FZl7uIYAgCWANFQbZYAZ7c';

// Set up authentication
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'privateSetting.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Create a new instance of the Sheets API
const sheets = google.sheets({ version: 'v4', auth });

// Create Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static pages on the base URL, on the root path
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*');
    res.sendFile('index.html');
});

// Handle GET requests on "/api"
async function onGet(req, res) {
    try {
        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:B',
        }
        );
        const manipulatedData = [];
        const data = result.data.values;
        for(let i = 1; i < data.length; i++){
            let temp = {
                name: data[i][0],
                email:data[i][1],
            };
            manipulatedData.push(temp);
        };

        const serializedData = JSON.stringify(manipulatedData);
        res.status(201).send(serializedData);

    } catch (err) {
        console.error(err);
        res.status(500).send('Google API Server error on GET');
    }

}

app.get('/api', onGet)


// Handle POST requests
async function onPost(req, res) {
    // Values that will be appended to the row.
    const values = [
        `${req.body.name}`,
        `${req.body.email}`
    ];
    if(req.body.email === undefined) {
        return res.status(501).json({status: 'Please fullfill the required fields'});
    }
    else if(req.body.name === undefined) {
        return res.status(501).json({status: 'Please fullfill the required fields'});
    }
    
    const request = {
        spreadsheetId:SPREADSHEET_ID,
        range:'Sheet1!A:B',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [values]
        },
        insertDataOption: 'INSERT_ROWS'
      };
    try{
        const result = await sheets.spreadsheets.values.append(request);
        res.status(201).json({ status: 'success' });
    }catch(err){
        console.log(err);
        res.status(501).json({ status: err.message });
    }
    
}

app.post('/api', onPost);

// Handle PUT requests
async function onPut(req, res) {
    const column = req.params.column.toLowerCase();
    const value = req.params.value;
    if(req.body.email === undefined || req.body.name === undefined ) {
        return res.status(501).json({status: 'Please fullfill the required fields'});
    };
    const values = [
        [
        `${req.body.name}`,
        `${req.body.email}`
    ]
    ];
    try{
        const dataResponse = await sheets.spreadsheets.values.get({
            spreadsheetId:SPREADSHEET_ID,
            range:'Sheet1!A:B'
        });
        const rows = dataResponse.data.values;
        const columnNames = rows[0].map( (column) => {return column.toLowerCase()});
        const columnIndex = columnNames.indexOf(column);
        for (let i = 1; i < rows.length; i++) {
            const currentRow = rows[i];
            if (currentRow[columnIndex] === value) {
                const rowRange = `Sheet1!A${i + 1}:B${i + 1}`;
                const updateRequest = {
                    spreadsheetId: SPREADSHEET_ID,
                    range: rowRange,
                    valueInputOption: "USER_ENTERED",
                    resource :{
                        values:values
                    },
                };
                const updateResponse = await sheets.spreadsheets.values.update(updateRequest);
                break;
                // console.log(updateResponse);
            }
        }
        res.status(201).json({response: 'success'});
        }catch(err){
        console.log(err);
        res.status(501).json({status:err.message});

    }
}

app.put('/api/:column/:value', onPut);

// Handle DELETE requests
async function onDelete(req, res) {
    const column = req.params.column.toLowerCase();
    const value = req.params.value;
    const dataRequest = {
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:B',
        majorDimension: 'ROWS',
        auth: auth,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'SERIAL_NUMBER',
    };
    try {
        const dataResponse = await sheets.spreadsheets.values.get(dataRequest);
        const rows = dataResponse.data.values;
        const columnNames = rows[0].map( (column) => {return column.toLowerCase()});
        const columnIndex = columnNames.indexOf(column);

        if(columnIndex === 0) {
            rowIndex = rows.findIndex(row => row[0] === value);
        }else if (columnIndex === 1) {
            rowIndex = rows.findIndex(row => row[1] === value);
        }else if(rowIndex === -1){
            res.status(201).json({status:'success'});
            return;
        }
        const deleteRequest = {
            spreadsheetId: SPREADSHEET_ID,
            range: `Sheet1!A${rowIndex + 1}:B${rowIndex + 1}`,
            auth: auth,
          };
        const deleteResponse = await sheets.spreadsheets.values.clear(deleteRequest);
        res.status(201).json({status:'success'});
        // console.log(deleteResponse);
    }catch(err){
        if(err.message === 'Unable to parse range: Sheet1!A0:B0'){
            return res.status(201).json({status:'success'});
        }
        console.log(err);
        res.status(501).json({ message: err.message });
    }
}

app.delete('/api/:column/:value', onDelete);
// Handle PATCH requests
async function onPatch(req,res){
    const column = req.params.column.toLowerCase();
    const value = req.params.value.toLowerCase();
    const name = req.body.name !== undefined ? req.body.name : undefined;
    const email = req.body.email !== undefined ? req.body.email : undefined;

    if((name && email)){
        return res.json({status:'PATCH request is for partially update.Please use PUT request for fully update for a record.'});
    }else if(name === undefined && email === undefined){
        return res.json({status:'PATCH request is for partially update.Please use PUT request for fully update for a record.'});
    }
    try{
        const dataResponse = await sheets.spreadsheets.values.get({
            spreadsheetId:SPREADSHEET_ID,
            range:'Sheet1!A:B'
        });
        const rows = dataResponse.data.values;
        const columnNames = rows[0].map( column => {return column.toLowerCase()});

        const columnIndex = columnNames.indexOf(column);
        for (let i = 1; i < rows.length; i++) {
            const currentRow = rows[i];
            if (currentRow[columnIndex] === value && (name) && !(email)) {
                console.log(name,email);
                const rowRange = `Sheet1!A${i + 1}:B${i + 1}`;
                const updateRequest = {
                    spreadsheetId: SPREADSHEET_ID,
                    range: rowRange,
                    valueInputOption: "USER_ENTERED",
                    resource :{
                        values:[[
                            `${name}`,
                            `${currentRow[1]}`
                        ]
                    ]
                    },
                };
                const updateResponse = await sheets.spreadsheets.values.update(updateRequest);
                // console.log(updateResponse); 
                res.status(201).json({response: 'success'});
                break;
            }
            else if (currentRow[columnIndex] === value && email && !(name)) {
                const rowRange = `Sheet1!A${i + 1}:B${i + 1}`;
                const updateRequest = {
                    spreadsheetId: SPREADSHEET_ID,
                    range: rowRange,
                    valueInputOption: "USER_ENTERED",
                    resource :{
                        values:[[
                            `${currentRow[0]}`,
                            `${email}`
                        ]
                    ]
                    },
                };
                const updateResponse = await sheets.spreadsheets.values.update(updateRequest);
                // console.log(updateResponse); 
                res.status(201).json({response: 'success'});
                break;
            }
        }
        }catch(err){
        console.log(err);
        res.status(501).json({status:err.message});

    }
}

app.patch('/api/:column/:value',onPatch);

const port = process.env.PORT || 3000;
const ip = "localhost";
app.listen(port, ip, () => {
    console.log(`CENG3502 Midterm Project Server running at http://${ip}:${port}`);
  });

