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
  "org.postgresql" % "postgresql" % "9.3-1100-jdbc41",
  "com.antigenomics" % "vdjdb" % "1.0-SNAPSHOT",
  javaJdbc,
  javaEbean,
  cache,
  filters
)     

play.Project.playJavaSettings
