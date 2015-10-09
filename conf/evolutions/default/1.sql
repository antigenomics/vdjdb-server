# --- Created by Ebean DDL
# To stop Ebean DDL generation, remove this comment and start using Evolutions

# --- !Ups

create table ipaddress (
  id                        bigint not null,
  ip                        varchar(255),
  last_login                timestamp,
  warn_level                integer,
  banned                    boolean,
  constraint pk_ipaddress primary key (id))
;

create table token (
  uuid                      varchar(36) not null,
  temp                      boolean,
  last_usage                timestamp,
  created_at                timestamp,
  constraint pk_token primary key (uuid))
;


create table ipaddress_token (
  ipaddress_id                   bigint not null,
  token_uuid                     varchar(36) not null,
  constraint pk_ipaddress_token primary key (ipaddress_id, token_uuid))
;

create table token_ipaddress (
  token_uuid                     varchar(36) not null,
  ipaddress_id                   bigint not null,
  constraint pk_token_ipaddress primary key (token_uuid, ipaddress_id))
;
create sequence ipaddress_seq;

create sequence token_seq;




alter table ipaddress_token add constraint fk_ipaddress_token_ipaddress_01 foreign key (ipaddress_id) references ipaddress (id);

alter table ipaddress_token add constraint fk_ipaddress_token_token_02 foreign key (token_uuid) references token (uuid);

alter table token_ipaddress add constraint fk_token_ipaddress_token_01 foreign key (token_uuid) references token (uuid);

alter table token_ipaddress add constraint fk_token_ipaddress_ipaddress_02 foreign key (ipaddress_id) references ipaddress (id);

# --- !Downs

drop table if exists ipaddress cascade;

drop table if exists ipaddress_token cascade;

drop table if exists token cascade;

drop table if exists token_ipaddress cascade;

drop sequence if exists ipaddress_seq;

drop sequence if exists token_seq;

