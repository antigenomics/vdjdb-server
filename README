VDJdb uses [VDJtools API](https://github.com/mikessh/vdjtools) and [VDJdb API](https://github.com/antigenomics/vdjdb-standalone) as a back-end. The software utilizes [Play framework](https://www.playframework.com/) for running the server instance.

## Installation

The most straightforward way to install VDJdb as a local server is to download the [latest release package](https://github.com/antigenomics/vdjdb/releases/latest).

After downloading unzip the package wherever you want, but please avoid long paths and spaces (Windows version is especially sensitive to it).

You can find the server executable in ``bin/`` directory. To set up the server:

- Run `vdjdb.bat` file (Windows)
- Run `bash vdjdb -Dconfig.file=../application.conf` in your console (Linux/Mac OS)

Wait until the server is started, and go to ``localhost:9000`` URL in your browser to open VDJviz.

To stop application just press `Ctrl-C` at any time in console.

> **Troubleshooting**. Note that an exception will be thrown in case the ``9000`` port is busy: ``org.jboss.netty.channel.ChannelException: Failed to bind to: /0.0.0.0:9000``. In order to fix it, either close the application that is using this port (in UNIX the 
``lsof -i:9000`` will give the processes that are using the port) or pass the ``-Dhttp.port=XXXX`` (where ``XXXX`` is new port id) argument to ``vdjviz`` shell script (UNIX) / ``vdjviz.bat`` (Windows)

## Server configuration

VDJdb server configuration can be performed by manually editing ``application.conf`` file in the ``conf/`` directory. The configuration file has the following fields:

- ``application.secret``
The secret key used in cryptographic hash functions.

- ``uploadPath``
Specifies the path that will be used by VDJviz to store user's uploaded files.
You can use '~' symbol as a shortcut for user home directory.
Default: `/tmp`

- ``maxFileSize``
File size limit in kB
Default: `0` (no limit)

- ``maxFilesCount``
Limit on the number of uploaded files per user.
Default: ``0`` (no limit)

- ``db.default.url``
Points to the path that will be used to store H2 database file.
Default value: ``~/vdjdb/h2.db``
Standalone version uses [H2 Database](http://www.h2database.com/html/main.html) for handling metadata by default, if you want to change H2 to another DBMS please see the corresponding Play documentation [section](https://www.playframework.com/documentation/2.2.4/JavaDatabase)
You can also use this database to manually modify user limits.

- ``securesocial.*``
[Secure social](http://securesocial.ws) configuration

- ``smtp.*``
SMTP server configuration.