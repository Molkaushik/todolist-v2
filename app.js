//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const dotEnv = require("dotenv");
//const session = require("express-session");
const passport = require("passport");
//const passportLocalMongoose = require("passport-local-mongoose");

dotEnv.config();

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

// app.use(session({
//   secret: "A long string",
//   resave: false,
//   saveUninitialized: false
// }));

// app.use(passport.initialize());
// app.use(passport.session());

mongoose.set("strictQuery", false);
const connectDB = async () => {
  try{
    mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology:true});
    console.log("MongoDB Connected.");
  } catch(err){
    console.log(err);
    process.exit(1);
  }
};

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = new mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "Hit the checkbox to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = new mongoose.model("List", listSchema);

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  lists: [listSchema]
});

// userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render('login', {text: "Password"});
});

app.get("/register", function(req, res){
  res.render('register', {text: "Username"});
});

app.get("/user", function(req, res){
  res.send("User successfully registered");
});

app.get("/:userName", function(req, res){
  const userName = req.params.userName;
// remember to check if the user is logged in or not
  User.findOne({username: userName}, function(err, foundUser){
    if(!err){
      if(!foundUser){
        res.redirect("/register");
      }else{
        if(foundUser.lists.length === 0){
          const list = new List({
            name: "My Day",
            items: defaultItems
          });
          foundUser.lists.push(list);
          foundUser.save();
          res.redirect("/" + userName);
        }else{
          res.render("list", {user: userName, listTitle: foundUser.lists[0].name, newListItems: foundUser.lists[0].items});
        }
      }
    }else console.log(err);
  });
});

app.get("/:userName/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);
  const userName = req.params.userName;
  User.findOne({username: userName}, function(err, foundUser){
    if(err) console.log(err);
    else{
      if(foundUser){
        User.findOne({'lists.name': customListName}, function(err, foundUserList){
          if(err) console.log(err);
          else{
            if(foundUserList){
              const ind = foundUserList.lists.findIndex(list => list.name === customListName);
              res.render("list", {user: userName, listTitle: customListName, newListItems: foundUserList.lists[ind].items});
            }else{
              const list = new List({
                name: customListName,
                items: defaultItems
              });
              foundUser.lists.push(list);
              foundUser.save();
              res.redirect("/" + userName + "/" + customListName);
            }
          }
        });
      }else res.redirect("/register");
    }
  });
});


app.post("/login", function(req, res){
  const userEmail = req.body.email;
  User.findOne({email: userEmail}, function(err, foundUser){
    if(foundUser){
      if(foundUser.password === req.body.password) res.redirect("/" + foundUser.username);
      else res.render("login", {text: "Incorrect Password"});
    }else res.redirect("/register");
  });
});

app.post("/register", function(req, res){
  const userEmail = req.body.email;
  const userName = req.body.userName;
  User.findOne({username: userName}, function(err, foundUsername){
    if(foundUsername){
      res.render("register", {text: "Username already exists! Try again."});
    }else{
      User.findOne({email: userEmail}, function(err, foundUser){
        if(!foundUser){
          const user = new User({
            username: userName,
            email: userEmail,
            password: req.body.password
          });
          user.save();
        }
        res.redirect("/" + userName);
      });
    }
  });
});

app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  const userName = req.body.userName;

  User.findOne({username: userName}, function(err, foundUser){
    if(!err){
      if(foundUser){
        if(listName === foundUser.lists[0].name){
          foundUser.lists[0].items = foundUser.lists[0].items.filter((item) => {
            return item._id != checkedItemId;
          });
          foundUser.save();
          res.redirect("/" + userName);
        }else{
          const ind = foundUser.lists.findIndex(list => list.name === listName);
          foundUser.lists[ind].items = foundUser.lists[ind].items.filter((item) => {
            return item._id != checkedItemId;
          });
          foundUser.save();
          res.redirect("/" + userName + "/" + listName);
        }
      }
    }
  });
});

app.post("/:userName", function(req, res){
  const userName = req.params.userName;
  const newItem = req.body.newItem;
  const listName = req.body.list;
  User.findOne({username: userName}, function(err, foundUser){
    if(!err){
      if(foundUser){
        const ind = foundUser.lists.findIndex(list => list.name === listName);
        const item = new Item({
          name: newItem
        });
        foundUser.lists[ind].items.push(item);
        foundUser.save();
      }
      if(listName === foundUser.lists[0].name) res.redirect("/"+userName);
      else res.redirect("/" + userName + "/" + listName);
    }
  });
});

connectDB().then(() => {
  app.listen(process.env.PORT || 3000, function() {
    console.log("Server started on port 3000");
  });
})
