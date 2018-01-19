module.exports = function(app, passport) {

// normal routes ===============================================================

    // show the login/create account page.
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    // home page.
    app.get('/home', isLoggedIn, function(req, res) {
        res.render('home.ejs', {
            user : req.user
        });
    });

    // logout action and go back to login page.
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // LOGIN ===============================
    // show the login form
    app.get('/login', function(req, res) {
        res.render('login.ejs', { message: req.flash('loginMessage') });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/home', // redirect to the secure home section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // SIGNUP =================================
    // show the signup form
    app.get('/signup', function(req, res) {
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/home', // redirect to the secure home section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

/*debugrob, called by a button on the home.ejs view.
 * Example of how a button on a page can call code.

    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user      = req.user;
        user.id       = undefined;
        user.password = undefined;
        user.save(function(err) {
            res.redirect('/home');
        });
    });
*/

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}


