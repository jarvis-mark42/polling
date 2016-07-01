'use strict';

var LocalStrategy   = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var configAuth = require('./auth');
var configDB = require('./database.js');

var bcrypt   = require('bcrypt-nodejs');
// configuration ===============================================================
var mysql      = require('mysql');
require('../app/models/setDatabase.js');
var shortID = require('shortid');
var connection = mysql.createConnection(configDB.db.local);

connection.connect();

connection.query('use polling');
module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        connection.query("select * from users where id = '"+id+"'",function(err,rows){
            done(err, rows[0]);
        });
    });

    passport.use(new FacebookStrategy({

            // pull in our app id and secret from our auth.js file
            clientID        : configAuth.facebookAuth.clientID,
            clientSecret    : configAuth.facebookAuth.clientSecret,
            callbackURL     : configAuth.facebookAuth.callbackURL

        },
        function( token, refreshToken, profile, done) {
            connection.query("select * from users where id = '" + profile.id + "'", function (err, rows) {
                if (err)
                    return done(err);
                if (rows.length) {
                    return done(null, rows[0]);
                } else {
                    var newUserMysql = new Object();
                    newUserMysql.id = profile.id;
                    newUserMysql.token = token;
                    newUserMysql.name  = profile.name.givenName + ' ' + profile.name.familyName;
                    newUserMysql.email = profile.emails[0].value;
                    var insertQuery = "INSERT INTO users (id,token,email,name) values ('" + profile.id + "','"+token+"','"+newUserMysql.email+"','"+newUserMysql.name+"')";

                    connection.query(insertQuery,function(err,rows){
                        if (err)
                            console.log(err);
                        newUserMysql.id = profile.id;
                        return done(null, newUserMysql);
                    });
                }
            })
        }));

    passport.use(new GoogleStrategy({

            // pull in our app id and secret from our auth.js file
            clientID        : configAuth.googleAuth.clientID,
            clientSecret    : configAuth.googleAuth.clientSecret,
            callbackURL     : configAuth.googleAuth.callbackURL

        },
        function( token, refreshToken, profile, done) {
            connection.query("select * from users where id = '" + profile.id + "'", function (err, rows) {
                if (err)
                    return done(err);
                if (rows.length) {
                    return done(null, rows[0]);
                } else {
                    var newUserMysql = new Object();
                    newUserMysql.id = profile.id;
                    newUserMysql.token = token;
                    newUserMysql.name  = profile.name.givenName + ' ' + profile.name.familyName;
                    newUserMysql.email = profile.emails[0].value;
                    var insertQuery = "INSERT INTO users (id,token,email,name) values ('" + profile.id + "','"+token+"','"+newUserMysql.email+"','"+newUserMysql.name+"')";
                    connection.query(insertQuery,function(err,rows){
                        console.log(insertQuery);
                        newUserMysql.id = profile.id;
                        return done(null, newUserMysql);
                    });
                }
            })
        }));

    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) {

            connection.query("select * from users where email = '"+email+"'",function(err,rows){
                if (err)
                    return done(err);
                if (rows.length) {
                    return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                } else {
                    var pass = bcrypt.hashSync(password, bcrypt.genSaltSync(8));
                    var newUserMysql = new Object();
                    var id = shortID.generate();
                    newUserMysql.id = id
                    newUserMysql.email    = email;
                    newUserMysql.password = pass; // use the generateHash function in our user model

                    var insertQuery = "INSERT INTO users (id, email, password ) values ('"+id+"','" + email +"','"+ pass +"')";
                    connection.query(insertQuery,function(err,rows){
                        newUserMysql.id = id;

                        return done(null, newUserMysql);
                    });
                }
            });
        }));

    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) { // callback with email and password from our form

            connection.query("SELECT * FROM `users` WHERE `email` = '" + email + "'",function(err,rows){
                if (err)
                    return done(err);
                if (!rows.length) {
                    return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
                }

                // if the user is found but the password is wrong
                if (!(bcrypt.compareSync(password, rows[0].password)))
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

                // all is well, return successful user
                return done(null, rows[0]);

            });
        }));
};
