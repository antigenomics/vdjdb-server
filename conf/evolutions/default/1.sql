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

create table server_file (
  id                        bigint not null,
  user_uuid                 varchar(255),
  file_name                 varchar(255),
  software                  integer,
  unique_name               varchar(255),
  created_at                timestamp,
  directory_path            varchar(255),
  file_path                 varchar(255),
  constraint ck_server_file_software check (software in (0,1,2,3,4,5,6,7)),
  constraint pk_server_file primary key (id))
;

create table user (
  uuid                      varchar(255) not null,
  provider                  varchar(255),
  email                     varchar(255),
  password                  varchar(255),
  directory_path            varchar(255),
  max_files_count           integer,
  max_files_size            integer,
  constraint pk_user primary key (uuid))
;

create sequence auth_token_seq;

create sequence server_file_seq;

create sequence user_seq;

alter table server_file add constraint fk_server_file_user_1 foreign key (user_uuid) references user (uuid) on delete restrict on update restrict;
create index ix_server_file_user_1 on server_file (user_uuid);



# --- !Downs

SET REFERENTIAL_INTEGRITY FALSE;

drop table if exists auth_token;

drop table if exists server_file;

drop table if exists user;

SET REFERENTIAL_INTEGRITY TRUE;

drop sequence if exists auth_token_seq;

drop sequence if exists server_file_seq;

drop sequence if exists user_seq;

