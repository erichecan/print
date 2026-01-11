const https = require('https');
const http = require('http');
const { URL } = require('url');

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkODZjYTNjMi1hNjFlLTQyMjQtYTkxNC04YzM1YmQwOWEzOGQiLCJpYXQiOjE3Njc5NTc2MzIsImV4cCI6MTc2ODU2MjQzMn0.2jHbn_aiig_5FjrfvaCm1mDsV-o2IzVH40Cm07DPBtQ";

// Decode Token (without verification)
function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return { error: "Failed to decode", details: e.message };
    }
}

console.log("--- Token Payload Analysis ---");
const payload = decodeToken(TOKEN);
console.log(payload);

if (payload.exp) {
    const expDate = new Date(payload.exp * 1000);
    console.log(`Expires: ${expDate.toISOString()}`);
    console.log(`Now:     ${new Date().toISOString()}`);
    console.log(`Expired? ${new Date() > expDate}`);
}
