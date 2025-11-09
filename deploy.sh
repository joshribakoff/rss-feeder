cp package.json dist/
cp package-lock.json dist/
cp ecosystem.config.js dist/

rsync --exclude="deploy.sh" --exclude="prisma/*.db" -avr ~/rss/dist/ root@159.223.193.148:/app/
