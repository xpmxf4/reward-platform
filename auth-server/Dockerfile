# Base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# For development: install all dependencies (including devDependencies)
# For production: use `npm ci --only=production`
RUN npm install

# Bundle app source
COPY . .

# Transpile TypeScript to JavaScript
RUN npm run build

# Default port, can be overridden by ENV
EXPOSE 3000 

# Command to run the application
CMD [ "node", "dist/main" ]
