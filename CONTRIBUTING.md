## CONTRIBUTING

> [!NOTE]
> The setup is kept simple and stupid. With more adoption we add more automation.

### Working with oclif
Refer to the [oclif documentation](https://oclif.io/docs/generator_commands#oclif-generate-command-name) to learn how to get started.

### Testing locally
```
./bin/dev.js <alias or command> -flag1 foo -flag2 bar
```

### Before the PR
```
# commit changes, then
npm version [minor|patch]
```

Minimal actions will ensure that the `package.json` and `README.md` have changed as will the reviewers.