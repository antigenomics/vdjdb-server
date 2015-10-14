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

create table sample_file (
  id                        bigint not null,
  token_uuid                varchar(36),
  file_name                 varchar(255),
  share_link                varchar(255),
  shared                    boolean,
  unique_name               varchar(255),
  created_at                timestamp,
  last_usage                timestamp,
  sample_size               integer,
  software_type             integer,
  directory_path            varchar(255),
  file_path                 varchar(255),
  constraint ck_sample_file_software_type check (software_type in (0,1,2,3,4,5,6,7)),
  constraint pk_sample_file primary key (id))
;

create table token (
  uuid                      varchar(36) not null,
  temp                      boolean,
  last_usage                timestamp,
  created_at                timestamp,
  max_file_size             integer,
  max_files_count           integer,
  max_clonotypes_count      integer,
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

create sequence sample_file_seq;

create sequence token_seq;

alter table sample_file add constraint fk_sample_file_token_1 foreign key (token_uuid) references token (uuid);
create index ix_sample_file_token_1 on sample_file (token_uuid);



alter table ipaddress_token add constraint fk_ipaddress_token_ipaddress_01 foreign key (ipaddress_id) references ipaddress (id);

alter table ipaddress_token add constraint fk_ipaddress_token_token_02 foreign key (token_uuid) references token (uuid);

alter table token_ipaddress add constraint fk_token_ipaddress_token_01 foreign key (token_uuid) references token (uuid);

alter table token_ipaddress add constraint fk_token_ipaddress_ipaddress_02 foreign key (ipaddress_id) references ipaddress (id);

# --- !Downs

drop table if exists ipaddress cascade;

drop table if exists ipaddress_token cascade;

drop table if exists sample_file cascade;

drop table if exists token cascade;

drop table if exists token_ipaddress cascade;

drop sequence if exists ipaddress_seq;

drop sequence if exists sample_file_seq;

drop sequence if exists token_seq;

