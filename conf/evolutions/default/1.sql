# --- Created by Ebean DDL
# To stop Ebean DDL generation, remove this comment and start using Evolutions

# --- !Ups

create table auth_token (
  uuid                      varchar(255) not null,
  email                     varchar(255),
  created_at                timestamp,
  expired_at                timestamp,
  sign_up                   boolean,
  constraint pk_auth_token primary key (uuid))
;

create table user (
  uuid                      varchar(255) not null,
  provider                  varchar(255),
  email                     varchar(255),
  password                  varchar(255),
  constraint pk_user primary key (uuid))
;

create sequence auth_token_seq;

create sequence user_seq;




# --- !Downs

SET REFERENTIAL_INTEGRITY FALSE;

drop table if exists auth_token;

drop table if exists user;

SET REFERENTIAL_INTEGRITY TRUE;

drop sequence if exists auth_token_seq;

drop sequence if exists user_seq;

