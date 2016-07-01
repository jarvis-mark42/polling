'use strict';

var mysql      = require('mysql');
var configDB = require('../../config/database.js');
var connection = mysql.createConnection(configDB.db.local);

connection.connect();
connection.query('create database polling',function(err){
    if (err) {
        return;
    }
});
connection.query('use polling');
var query = 'create table users (id varchar(100) NOT NULL,token varchar(100), email varchar(50), password varchar(100),name varchar(100),PRIMARY KEY (id));';
connection.query(query,function(err){
    if (err) {
        return;
    }
});
