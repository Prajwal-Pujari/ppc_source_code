const http = require('http');

const loginOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(loginOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const token = JSON.parse(data).data.token;
            console.log("Token received");
            
            const taskOptions = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/v1/worker/tasks',
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            };
            
            http.request(taskOptions, (res2) => {
                let data2 = '';
                res2.on('data', (chunk) => data2 += chunk);
                res2.on('end', () => {
                    console.log("Status Code:", res2.statusCode);
                    console.log("Tasks response:", data2.substring(0, 1000));
                });
            }).end();
            
        } catch (e) {
            console.error("Failed to parse login:", data);
        }
    });
});

req.on('error', console.error);
req.write(JSON.stringify({username: 'suresh', password: 'Test@123'}));
req.end();
