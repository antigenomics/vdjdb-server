name := "vdjdb-server"

version := "1.0.1"

resolvers += Resolver.sonatypeRepo("releases")

resolvers += (
  "Local Maven Repository" at "file:///"+Path.userHome.absolutePath+"/.m2/repository"
  )

resolvers += (
  "Sonatype OSS Snapshots" at "https://oss.sonatype.org/content/repositories/snapshots"
  )

libraryDependencies ++= Seq(
  "ws.securesocial" %% "securesocial" % "2.1.4",
  "com.typesafe.play.plugins" %% "play-plugins-mailer" % "2.3.0",
  "com.antigenomics" % "vdjdb" % "1.1.6",
  "mysql" % "mysql-connector-java" % "5.1.18",
  "org.apache.poi" % "poi" % "3.9",
  javaJdbc,
  cache,
  javaEbean
)     

play.Project.playScalaSettings
