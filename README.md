# HW4 - Blue/Green Deployment and Data Migration

[Problem Description](https://github.com/CSC-DevOps/Course/blob/master/HW/HW4.md)  
[Target app](https://github.com/Druotic/devops-hw3) used for deployment

Outside/primary access port: 8080  (e.g. http://127.0.0.1:8080/)  
Blue server port: 9090  
Blue redis port: 6379  
Green server port: 5060  
Green redis port: 6380

A blue/green deployment infrastructure was used (with post-receive hooks, npm install, etc) as outlined in the workshop. See original workshop spec for more details.  I have included the `deploy/` directory as an example, but normally this would change often (with each push).  The latest working version of the app from HW3 (modified) has been pushed to both the blue and green slices.  I excluded the bare repos with hooks (`deploy/blue.git/` and `deploy/green.git/`) as this was not required for submission.

A new route `/switch` has been introduced which will switch between the "blue" and "green" slices. When switched, new requests will go to the other server (and this server uses a different redis instance as well).  For convenience, a call to the root path (e.g. `http://localhost:8080/`) will print "hello world" followed by the server port number (e.g. 9090) and the redis port number (e.g. 6379) to help with identifying which slice we are currently on.

`/switch` has been extended to migrate any existing images in the 'image' list of the current redis instance to the other slice during the switch.  This means any existing images on the slice being switched to will be deleted and replaced with the current slice's.

A feature flag "mirroring" has been introduced. When enabled (enabled by default), all images added in the current slice will be added to the other as well.



## Workshop: Deployments and Deflighting - Original Spec

In this workshop, we'll cover the basics of setting up a barebone deployment pipeline, in support of a green-blue deployment strategy.  We will be able to build upon this exercise in the upcoming homework and DEPLOYMENT milestone.

To start with, you'll need some files in this repo to help setup the blue-green infrastructure.

    git clone https://github.com/CSC-DevOps/Deployment.git
    npm install

### Initializing our endpoints.

We'll create two endpoints for our deployment, a "green" endpoint for our baseline, and a "blue" endpoint for our test commits.  We will be using git repositories to help with *copying over bits*.  [See guide](http://toroid.org/ams/git-website-howto) for more details.

Create a folder structure as follows:

* deploy/
  * blue.git/
  * blue-www/
  * green.git/
  * green-www/

To ensure we have a git repo that will always have files that reflect the most current state of the repo, we will use a "bare" repository, which will not have a working tree.  Using a hook script, the changes will then be checked out to public directory.

    cd deploy/green.git
    git init --bare
    cd ..
    cd blue.git
    git init --bare

##### Post-Receive Hook

Inside `$ROOT/green.git/hooks/` inside a `post-receive` file, place the following:

    GIT_WORK_TREE=$ROOT/green-www/ git checkout -f

Repeat for blue.

**Hints**

* You must create the *-www folder manually.
* You may have to add executable permissions using in *nix systems `chmod +x post-receive`.
* **Ensure that there is a script header**, such as `#!/bin/sh`, on the first line.
* For the purpose of this workshop, `$ROOT` refers to the absolute path of your folder.
* It will not work the first time.

### Deploying Commits and Copying Bits

Clone the [app repo](https://github.com/CSC-DevOps/App), and set the following remotes.  See help on [file protocol syntax](http://en.wikipedia.org/wiki/File_URI_scheme#Format).

    git remote add blue file://$ROOT/blue.git
    git remote add green file://$ROOT/green.git

You can now push changes in the following manner.

    git push green master
    git push blue master

You may have to create a simple commit before pushing.

### Testing deployment

Install a node process supervisor, globally, as needed by the demo, run:

    npm install -g forever

Then bring up the infrastructure:

    node infrastructure

When you first run it.  It will not work!  Notice that *-www, doesn't have any node_modules/ installed.  Think about some of the conceptual issues of deploying code versus a build.  For now, you can add into a hook, a step to run: "npm install".

You should be able to visit localhost:8080 and access the green slice!
In expanding on this concept, we could do the same exact steps, but on a different AWS instances, droplets, etc.

### Deploy a change.

Change the message to report, "Hello Blue".  

Push the change.

Test the blue server directly, using port 9090.

Notice, it hasn't updated yet...

You will need to modify how "forever" is run, by including a "--watch" flag which will restart the process if the file it is running changes.  Think carefully on where to place the flag.  You may also need to use "--watchDirectory" depending on where you have placed the deploy folders.

Push another change, "Hello Blue 2".  Now see if you can observe on the blue server.

### Add auto-switch over.

Have the default TARGET to be BLUE now.

Modify the app repo, to explicitly fail with : `res.status(500).send('Something broke!');`

Have a heartbeat that checks every 30 second for a http 500, and if so, will switch the proxy over to the green environment.

This idea can be generalized to be triggered by any other monitoring/alerts/automated testing (during staging). E.g., See how to use [toobusy](https://hacks.mozilla.org/2013/01/building-a-node-js-server-that-wont-melt-a-node-js-holiday-season-part-5/).
