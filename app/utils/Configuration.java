package utils;

import play.Play;


public class Configuration {
    public static final String uploadDirectory = Play.application().configuration().getString("uploadDirectory");
    public static final String debugToken = Play.application().configuration().getString("debugToken");
    public static Integer maxClonotypesCount = Play.application().configuration().getInt("maxClonotypesCount");
    public static Integer maxFilesCount = Play.application().configuration().getInt("maxFilesCount");
    public static Integer maxFileSize = Play.application().configuration().getInt("maxFileSize");
    //TODO
    public static Integer maxTotalMutations = 2;
}
