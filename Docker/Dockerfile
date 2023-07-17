FROM node:14.18.1

ENV PORT 8080
ENV settings /home/site/wwwroot/config/login.dfe.services.tran.json
ENV PATH ${PATH}:/home/site/wwwroot

WORKDIR /home/site/wwwroot

COPY process.json /home/site/wwwroot
#ADD app_data ./home/site/wwwroot_data
COPY node_modules /home/site/wwwroot/node_modules
ADD config /home/site/wwwroot/config
COPY src /home/site/wwwroot/src
COPY package.json /home/site/wwwroot/

RUN npm install pm2 -g
ENV PM2HOME /pm2home

# enable SSH
ENV SSH_PASSWD "root:Docker!"
RUN apt-get update 
RUN mkdir -p /home/LogFiles 
RUN apt-get install -y --no-install-recommends dialog 
RUN apt-get update 
RUN apt-get install -y --no-install-recommends openssh-server 
RUN echo "$SSH_PASSWD" | chpasswd 

COPY Docker/sshd_config /etc/ssh/sshd_config

EXPOSE 8080 2222

ENTRYPOINT ["pm2", "start", "/home/site/wwwroot/process.json", "--no-daemon"]