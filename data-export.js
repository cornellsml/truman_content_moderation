#! /usr/bin/env node

console.log('This data export is running!!!!');


const async = require('async')
const Actor = require('./models/Actor.js');
const Script = require('./models/Script.js');
const User = require('./models/User.js');
const _ = require('lodash');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs')
var UAParser = require('ua-parser-js');
const util = require('util');



var csvWriter = require('csv-write-stream');
var mlm_writer = csvWriter();
var s_writer = csvWriter();
var summary_writer = csvWriter();
//5bb3a93ad9fd14471bf3977d
//5bb3a93ad9fd14471bf39791
//5bb3a93ad9fd14471bf39792
//5bb3a93ad9fd14471bf397c8
/*var bully_messages = ["5bb3a93ad9fd14471bf3977d",
"5bb3a93ad9fd14471bf39791",
"5bb3a93ad9fd14471bf39792",
"5bb3a93ad9fd14471bf397c8"];*/
var bully_stats = [];
var sur_array = [];

//postIDs for the posts we have interest in
//UPDATE THESE WHENEVER NODE POPULATE IS RUN.
day1Flagged = "5daf4731b9d8e835881bb160";
day1FlaggedCommentUnambig = "5daf4778b9d8e835881bbec9";
day1FlaggedCommentAmbig = "5daf4778b9d8e835881bbeca";
day1NotFlagged = "5daf4732b9d8e835881bb1e2";
day1NotFlaggedComment = "5daf4778b9d8e835881bbecb";
day2Flagged = "5daf4732b9d8e835881bb209";
day2FlaggedCommentUnambig = "5daf4778b9d8e835881bbecc";
day2FlaggedCommentAmbig = "5daf478fb9d8e835881bbfe6";
day2NotFlagged = "5daf4732b9d8e835881bb1fc";
day2NotFlaggedComment = "5daf478fb9d8e835881bbfe7";


Array.prototype.sum = function() {
    return this.reduce(function(a,b){return a+b;});
};



var mlm_array = [];

//dotenv.load({ path: '.env' });
dotenv.config({path: '.env'});

/*
var MongoClient = require('mongodb').MongoClient
 , assert = require('assert');


//var connection = mongo.connect('mongodb://127.0.0.1/test');
mongoose.connect(process.env.PRO_MONGODB_URI || process.env.PRO_MONGOLAB_URI);
var db = mongoose.connection;
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
}); */

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;

//mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
//mongoose.connect(process.env.MONGOLAB_TEST || process.env.PRO_MONGOLAB_URI, { useMongoClient: true });
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI, { useNewUrlParser: true });
mongoose.connection.on('error', (err) => {
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  console.error(err);
  process.exit();
});


User.find()
  .where('active').equals(false)
  .populate({
         path: 'feedAction.post',
         model: 'Script',
         populate: {
           path: 'actor',
           model: 'Actor'
         }
      })
  .exec(
    function(err, users){

      mlm_writer.pipe(fs.createWriteStream('results/mlm_eatsnaplove.csv'));
      s_writer.pipe(fs.createWriteStream('results/posts_eatsnaplove.csv'));
      summary_writer.pipe(fs.createWriteStream('results/sum_eatsnaplove.csv'));

      for (var i = users.length - 1; i >= 0; i--) //for each inactive user in the users table
      {

        var mlm = {};
        var sur = {};
        var sums = {};
        mlm.id = users[i].mturkID;
        sur.id = users[i].mturkID;
        sums.id = users[i].mturkID;


        mlm.email = users[i].email;
        sur.email = users[i].email;
        sums.email = users[i].email;

        mlm.StartDate = users[i].createdAt;
        sur.StartDate = users[i].createdAt;
        sums.StartDate = users[i].createdAt;

        console.log("In User "+ users[i].email);
        //console.log("In User Number "+ i);

        //UI - transparency script_type: String, //type of script they are running in
        //post_nudge: String,

        //mlm.script_type = users[i].script_type;
        //sums.script_type = users[i].script_type;

        //study group information

        //moderation type, comment type (changing mod type labels from db for better readability)
        if(users[i].flag_group === "none"){
          mlm.moderationType = "unknown";
          sums.moderationType = "unknown";
        } else if (users[i].flag_group === "ai"){
          mlm.moderationType = "automated";
          sums.moderationType = "automated";
        } else if (users[i].flag_group === "user"){
          mlm.moderationType = "users";
          sums.moderationType = "users";
        } else { //this case should NEVER happen, but including as a precaution
          mlm.moderationType = "?";
          sums.moderationType = "?";
        }

        mlm.commentType = users[i].bully_group;
        sums.commentType = users[i].bully_group;

        //profile_perspective, uses booleans to indicate if a change was made
        if (users[i].post_nudge == 'yes')
        {
          mlm.post_nudge = 1;
          sums.post_nudge = 1;
        }
        else
        {
          mlm.post_nudge = 0;
          sums.post_nudge = 0;
        }


        if (users[i].profile.name)
        {
          mlm.ProfileName = 1;
          sums.ProfileName = 1;
        }
        else
        {
          mlm.ProfileName = 0;
          sums.ProfileName = 0;
        }

        if (users[i].profile.location)
        {
          mlm.ProfileLocation = 1;
          sums.ProfileLocation = 1;
        }
        else
        {
          mlm.ProfileLocation = 0;
          sums.ProfileLocation = 0;
        }

        if (users[i].profile.bio)
        {
          mlm.ProfileBio = 1;
          sums.ProfileBio = 1;
        }
        else
        {
          mlm.ProfileBio = 0;
          sums.ProfileBio = 0;
        }

        if (users[i].profile.picture)
        {
          mlm.ProfilePicture = 1;
          sums.ProfilePicture = 1;
        }
        else
        {
          mlm.ProfilePicture = 0;
          sums.ProfilePicture = 0;
        }

        var parser = new UAParser();

        if(users[i].log[0])
        {

          if (parser.setUA(users[i].log[0].userAgent).getDevice().type)
          {
            mlm.Device = parser.setUA(users[i].log[0].userAgent).getDevice().type;
          }
          else
            mlm.Device = "Computer";



          //sur.Device = mlm.Device;

          mlm.Broswer = parser.setUA(users[i].log[0].userAgent).getBrowser().name;
          //sur.Broswer = mlm.Broswer;

          mlm.OS = parser.setUA(users[i].log[0].userAgent).getOS().name;
          //sur.OS = mlm.OS;
        }//if Log exists
        else{
          mlm.Device = "NA";
          mlm.Broswer = "NA";
          mlm.OS = "NA";
        }


        mlm.notificationpage = 0;
        mlm.generalpagevisit = 0;
        for(var z = 0; z < users[i].pageLog.length; ++z){
            if(users[i].pageLog[z].page == "Notifications")
              mlm.notificationpage++;
            else
              mlm.generalpagevisit++;
        }


        mlm.citevisits = users[i].log.length;
        sums.citevisits = users[i].log.length;

        if (users[i].completed)
        {
          mlm.CompletedStudy = 1;
          sums.CompletedStudy = 1;
          //sur.CompletedStudy = 1;
        }
        else
        {
          mlm.CompletedStudy = 0;
          sums.CompletedStudy = 0;
          //sur.CompletedStudy = 0;
        }

        if (users[i].study_days.length > 0) //how many visits per day of the study
        {
          mlm.DayOneVists = users[i].study_days[0];
          mlm.DayTwoVists = users[i].study_days[1];
          //mlm.DayThreeVists = users[i].study_days[2];

          sums.DayOneVists = users[i].study_days[0];
          sums.DayTwoVists = users[i].study_days[1];
          //sums.DayThreeVists = users[i].study_days[2];
        }


        mlm.GeneralLikeNumber = 0;
        mlm.GeneralFlagNumber = 0;

        mlm.GeneralPostNumber = users[i].numPosts + 1;
        mlm.GeneralCommentNumber = users[i].numComments + 1;

        sums.GeneralPostNumber = mlm.GeneralPostNumber;
        sums.GeneralCommentNumber = mlm.GeneralCommentNumber;

        //Responses and times for day 1
        mlm.day1_modResponse = users[i].day1Response;
        mlm.day1_modResponseTime = users[i].day1ResponseTime;
        mlm.day1_policyResponse = users[i].day1ViewPolicyResponse;
        mlm.day1_policyResponseTime = users[i].day1ViewPolicyResponseTime;
        mlm.day1_totalPolicyVisits = users[i].day1ViewPolicySources.length;
        mlm.day1_policyVisitSources = users[i].day1ViewPolicySources; //this is in order of occurrence

        //responses and times for day 2
        mlm.day2_modResponse = users[i].day2Response;
        mlm.day2_modResponseTime = users[i].day2ResponseTime;
        mlm.day2_policyResponse = users[i].day2ViewPolicyResponse;
        mlm.day2_policyResponseTime = users[i].day2ViewPolicyResponseTime;
        mlm.day2_totalPolicyVisits = users[i].day2ViewPolicySources.length;
        mlm.day2_policyVisitSources = users[i].day2ViewPolicySources; //this is in order of occurrence

        //per feedAction
        sur.postID = -1;
        sur.body = "";
        sur.picture = "";
        sur.absTime = "";
        sur.citevisits = -1;
        sur.generalpagevisit = -1;
        sur.DayOneVists = -1;
        sur.DayTwoVists = -1;
        sur.DayThreeVists = -1;
        sur.GeneralLikeNumber = -1;
        sur.GeneralFlagNumber = -1;
        sur.GeneralPostNumber = -1;
        sur.GeneralCommentNumber = -1;

        console.log("User has "+ users[i].posts.length+" Posts");
        for (var pp = users[i].posts.length - 1; pp >= 0; pp--)
        {
          var temp_post = {};
          temp_post = JSON.parse(JSON.stringify(sur));


          //console.log("Checking User made post"+ users[i].posts[pp].postID)
          temp_post.postID = users[i].posts[pp].postID;
          temp_post.body = users[i].posts[pp].body;
          temp_post.picture = users[i].posts[pp].picture;
          temp_post.absTime = users[i].posts[pp].absTime;

          var postStatsIndex = _.findIndex(users[i].postStats, function(o) { return o.postID == users[i].posts[pp].postID; });
          if(postStatsIndex!=-1)
          {
              console.log("Check post LOG!!!!!!");
              temp_post.citevisits = users[i].postStats[postStatsIndex].citevisits;
              temp_post.generalpagevisit = users[i].postStats[postStatsIndex].generalpagevisit;
              temp_post.DayOneVists = users[i].postStats[postStatsIndex].DayOneVists;
              temp_post.DayTwoVists = users[i].postStats[postStatsIndex].DayTwoVists;
              temp_post.DayThreeVists = users[i].postStats[postStatsIndex].DayThreeVists;
              temp_post.GeneralLikeNumber = users[i].postStats[postStatsIndex].GeneralLikeNumber;
              temp_post.GeneralPostLikes = users[i].postStats[postStatsIndex].GeneralPostLikes;
              temp_post.GeneralCommentLikes = users[i].postStats[postStatsIndex].GeneralCommentLikes;
              temp_post.GeneralFlagNumber = users[i].postStats[postStatsIndex].GeneralFlagNumber;
              temp_post.GeneralPostNumber = users[i].postStats[postStatsIndex].GeneralPostNumber;
              temp_post.GeneralCommentNumber = users[i].postStats[postStatsIndex].GeneralCommentNumber;
          }

          sur_array.push(temp_post);
        }

        //per feedAction
        //for (var k = users[i].feedAction.length - 1; k >= 0; k--)
        for (var k = 0; k <= (users[i].feedAction.length - 1); k++)
        {

          var currentAction = users[i].feedAction[k];
          var namePrefix = "";
          //singling out the posts we are interested in (there are 4)
          //TODO: Use dynamic vars to name according to the case so I don't have to copy paste the code 4 times with different vars
          if(currentAction.post.id == day1Flagged){
            namePrefix = "day1_Flagged_";
          } else if (currentAction.post.id == day1NotFlagged){
            namePrefix = "day1_NotFlagged_";
          } else if (currentAction.post.id == day2Flagged){
            namePrefix = "day2_Flagged_";
          } else if (currentAction.post.id == day2NotFlagged){
            namePrefix = "day2_NotFlagged_";
          }

          if((currentAction.post.id == day1Flagged) || (currentAction.post.id == day1NotFlagged) || (currentAction.post.id == day2Flagged) || (currentAction.post.id == day2NotFlagged)){
            mlm[namePrefix + "VictimPostLiked"] = currentAction.liked;
            mlm[namePrefix +"VictimPostTimesLiked"] = currentAction.likeTime.length;
            mlm[namePrefix +"VictimPostLastLikeTime"] = currentAction.likeTime[currentAction.likeTime.length -1];
            //logic to determine if flagged or not based on if there are any timestamps
            if(currentAction.flagTime.length > 0) {
              mlm[namePrefix +"VictimPostFlagged"] = true;
            } else {
              mlm[namePrefix +"VictimPostFlagged"] = false;
            }
            mlm[namePrefix +"VictimPostFlaggedTime"] = currentAction.flagTime[currentAction.flagTime.length - 1];
            mlm[namePrefix +"VictimPostTotalViews"] = currentAction.viewedTime.length;
            //calculate average view time for the post
            var averageVictimPostViewTime = 0;
            for(var m = currentAction.viewedTime.length - 1; m >= 0; m--){
              averageVictimPostViewTime = averageVictimPostViewTime + currentAction.viewedTime[m];
            }
            if(currentAction.viewedTime.length != 0){
              averageVictimPostViewTime = averageVictimPostViewTime / currentAction.viewedTime.length;
              mlm[namePrefix + "VictimPostAvgViewTime"] = averageVictimPostViewTime;
            }
            //info about the bully comment, report correct comment based on ambig/unambig bully group
            //for(var j = currentAction.comments.length - 1; j >= 0; j--){
            for(var j = 0; j <= (currentAction.comments.length - 1); j++){
              currentComment = currentAction.comments[j];
              console.log("####");
              console.log("iterating through the comments...");
              console.log(currentComment.new_comment);
              console.log(typeof currentComment.new_comment);
              if(currentComment.new_commment === false){ //safeguard - everything will break if you try to query the comment id of a user comment
                console.log("You're past the safeguard...");
                if(users[i].bully_group === "ambig"){
                  if((currentComment.comment.id === day1FlaggedCommentAmbig) || (currentComment.comment.id === day2FlaggedCommentAmbig)){
                    mlm[namePrefix+"BullyCommentLiked"] = currentComment.liked;
                    mlm[namePrefix +"BullyCommentTimesLiked"] = currentComment.likeTime.length;
                    mlm[namePrefix +"BullyCommentLastLikeTime"] = currentComment.likeTime[currentComment.likeTime.length -1];
                    mlm[namePrefix+"BullyCommentFlagged"] = currentComment.flagged;
                    mlm[namePrefix +"BullyCommentLastFlagTime"] = currentComment.flagTime[currentComment.flagTime.length -1];
                  }
                } else if (users[i].bully_group === "unambig"){
                  if((currentComment.comment.id === day1FlaggedCommentUnambig) || (currentComment.comment.id === day2FlaggedCommentUnambig)){
                    mlm[namePrefix+"BullyCommentLiked"] = currentComment.liked;
                    mlm[namePrefix +"BullyCommentTimesLiked"] = currentComment.likeTime.length;
                    mlm[namePrefix +"BullyCommentLastLikeTime"] = currentComment.likeTime[currentComment.likeTime.length -1];
                    mlm[namePrefix+"BullyCommentFlagged"] = currentComment.flagged;
                    mlm[namePrefix +"BullyCommentLastFlagTime"] = currentComment.flagTime[currentComment.flagTime.length -1];
                  }
                }
              }
            }
          }
          //done exporting info about special posts

          //console.log(util.inspect(users[i].feedAction[k], false, null))
          if(users[i].feedAction[k].post == null)
          {
            //console.log("@$@$@$@$@ action ID NOT FOUND: "+users[i].feedAction[k].id);
          }

          //not a bully message
          else
          {

            //total number of likes
            if(users[i].feedAction[k].liked)
            {
              mlm.GeneralLikeNumber++;
            }

            //total number of flags
            if(users[i].feedAction[k].flagTime[0])
            {
              mlm.GeneralFlagNumber++;
            }

          }


        }//for Per FeedAction

      //mlm.GeneralReplyNumber = users[i].numReplies + 1;

      summary_writer.write(sums);


      mlm_writer.write(mlm);
      //s_writer.write(sur);


    }//for each user

    /*
    for (var zz = 0; zz < mlm_array.length; zz++) {
      //console.log("writing user "+ mlm_array[zz].email);
      //console.log("writing Bully Post "+ mlm_array[zz].BullyingPost);
      mlm_writer.write(mlm_array[zz]);
    }
    */
    console.log("Post Table should be "+ sur_array.length);
      for (var zz = 0; zz < sur_array.length; zz++) {
      //console.log("writing user "+ mlm_array[zz].email);
      console.log("writing Post for user "+ zz);
      s_writer.write(sur_array[zz]);
    }

    mlm_writer.end();
    summary_writer.end();
    s_writer.end();
    console.log('Wrote MLM!');
    mongoose.connection.close();

  });
