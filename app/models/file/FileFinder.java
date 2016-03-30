package models.file;

import models.auth.User;
import play.db.ebean.Model;

/**
 * Created by bvdmitri on 30.03.16.
 */

public class FileFinder<T extends Model> {

    Class<T> tClass;

    public FileFinder(Class<T> tClass) {
        this.tClass = tClass;
    }

    private Model.Finder<Long, T> find() {
        return new Model.Finder<>(Long.class, tClass);
    }

    public T findByNameAndUser(User user, String fileName) {
        return find().where().eq("user", user).eq("fileName", fileName).findUnique();
    }

}
