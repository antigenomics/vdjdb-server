package models.file;

import com.antigenomics.vdjtools.misc.Software;
import models.auth.User;
import play.db.ebean.Model;

import javax.persistence.Entity;

/**
 * Created by bvdmitri on 30.03.16.
 */

@Entity
public class IntersectionFile extends ServerFile  {
    protected Software software;

    public IntersectionFile(User user, String fileName, String uniqueName, String directoryPath, String filePath, Software software) {
        super(user, fileName, uniqueName, directoryPath, filePath);
        this.software = software;
    }

    public Software getSoftware() {
        return software;
    }

}
