#!/bin/sh
composer network install --card PeerAdmin@hlfv1 --archiveFile basic-maker-checker-app.bna
composer network start --networkName basic-maker-checker-app --networkVersion 0.0.1 --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@hlfv1 --file admin.card
composer card import --file admin.card
composer network ping --card admin@basic-maker-checker-app
composer participant add -c admin@basic-maker-checker-app -d '{"$class": "org.makerchecker.User","userId": "goCs64Y5jnra","userName": {"$class": "org.makerchecker.Name","firstName": "Srishty","lastName": "Bhambri"},"gender": "FEMALE","age": 21,"isDeleted": false}'
composer participant add -c admin@basic-maker-checker-app -d '{"$class": "org.makerchecker.User","userId": "m7JeGlB6iVxs","userName": {"$class": "org.makerchecker.Name","firstName": "Lakshay","lastName": "Bhambri"},"gender": "MALE","age": 24,"isDeleted": false}'
composer identity issue -c admin@basic-maker-checker-app -f srishty.card -u goCs64Y5jnra -a "resource:org.makerchecker.User#goCs64Y5jnra"
composer identity issue -c admin@basic-maker-checker-app -f lakshay.card -u m7JeGlB6iVxs -a "resource:org.makerchecker.User#m7JeGlB6iVxs"
docker stop mongo && docker rm mongo
docker stop rest && docker rm rest
docker run -d --name mongo --network composer_default -p 27017:27017 mongo:4
docker run -d -e COMPOSER_CARD="admin@basic-maker-checker-app" -e COMPOSER_NAMESPACES="never" -e COMPOSER_AUTHENTICATION="true" -e COMPOSER_MULTIUSER="true" -e COMPOSER_PROVIDERS="{\"jwt\": {\"provider\": \"jwt\",\"module\": \"/home/composer/node_modules/custom-jwt.js\",\"secretOrKey\": \"gSi4WmttWuvy2ewoTGooigPwSDoxwZOy\",\"authScheme\": \"saml\",\"successRedirect\": \"/\",\"failureRedirect\":\"/\"}}" -e COMPOSER_DATASOURCES="{\"db\": {\"name\": \"db\",\"connector\": \"mongodb\",\"host\": \"mongo\"}}" -v /c/Users/Lakshay/.composer:/home/composer/.composer --network composer_default --name rest -p 3000:3000 localhost/my-composer-rest-server