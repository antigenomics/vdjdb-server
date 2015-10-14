package utils;

import play.Logger;

public class LogUtil {
    public enum LogType {
        WARN,
        INFO,
        ERROR
    }


    public static void log(String message, String token) {
        log(message, token, LogType.INFO);
    }

    public static void errorLog(String message, String token) {
        log(message, token, LogType.ERROR);
    }

    public static void warnLog(String message, String token) {
        log(message, token, LogType.WARN);
    }

    public static void log(String message, String token, LogType logType) {
        switch (logType) {
            case INFO:
                Logger.info("Token: " + token + ":  " + message);
                break;
            case WARN:
                Logger.warn("Token: " + token + ":  " + message);
                break;
            case ERROR:
                Logger.error("Token: " + token + ":  " + message );
                break;
        }
    }

}
