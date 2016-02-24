name := "vdjdb-server"

version := "1.0-SNAPSHOT"

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
  "com.antigenomics" % "vdjdb" % "1.0.2-SNAPSHOT",
  "com.fasterxml.jackson.core" % "jackson-databind" % "2.7.1",
  javaJdbc,
  cache,
  javaEbean
)     

play.Project.playScalaSettings
