package utils;

import play.Logger;

public class LogUtil {
    public enum LogType {
        WARN,
        INFO,
        ERROR
    }


    public static void log(String message) {
        log(message, LogType.INFO);
    }

    public static void log(String message, LogType logType) {
        switch (logType) {
            case INFO:
                Logger.info(message);
                break;
            case WARN:
                Logger.warn(message);
                break;
            case ERROR:
                Logger.error(message);
                break;
        }
    }

}
