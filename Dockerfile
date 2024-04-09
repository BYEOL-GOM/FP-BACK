# 수동으로 입력하는 방식
# 1. 운영체제 및 프로그램 설치
# CD로 운영체제 설치 or 부팅용 USB로 설치하는 방법 등이 있다.
# 하지만 도커의 장점을 활용해보자! : 컴퓨터들이 모여져있는 홈페이지가 있다(도커허브) 그 컴퓨터를 다운 받을 수 있다.
# 도커허브 홈페이지로 가서 'ubuntu' 검색하면 확인 가능. 그 ubuntu를 다운받는다는 코드. 
# FROM ubuntu:22.04

# 2. Node.js 설치(ubuntu에 설치)
# ubuntu를 다운로드 받으면 터미널 하나가 실행된다는 의미.
# RUN sudo apt install nodejs
# RUN sudo npm install -g yarn

# 1. 운영체제 및 프로그램 설치(이미 리눅스, node, npm, yarn까지 모두 깔려있는 컴퓨터 다운로드하는 방식)
FROM node:20

# 2. 내 컴퓨터에 있는 폴더나 파일을 도커 컴퓨터 안으로 복사하기
# CLI - RUN : 실행 / mkdir : 폴더 만들기
RUN mkdir myfolder
# myfolder 안으로 이동하기
RUN cd myfolder

# CLI - COPY : docker 바깥에 있는 내용을 안쪽으로 복사해줘.
COPY src/app.js /myfolder/app.js