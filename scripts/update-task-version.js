const fs = require('fs');
const path = require('path');

const extenstionFile = fs.readFileSync(path.resolve(__dirname, '..', './azure-devops-extension.json'), {
    encoding: 'utf8',
    flag: 'r',
});
const taskFile = fs.readFileSync(path.resolve(__dirname, '..', './dist/task.json'), { encoding: 'utf8', flag: 'r' });

const [major, minor, patch] = JSON.parse(extenstionFile).version.split('.');

const taskData = JSON.parse(taskFile);
taskData.version = {
    Major: major,
    Minor: minor,
    // Unfortenately tfx cannot update version for task.json so we do it by hand
    Patch: Number(patch) + 1,
};

fs.writeFileSync(path.resolve(__dirname, '..', './dist/task.json'), JSON.stringify(taskData));
