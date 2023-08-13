# TargetBranchValidator [Azure Pipeline Extension]

<img align="right" width="95" height="95"
     alt="TargetBranchValidator extension"
     src="https://raw.githubusercontent.com/evless/azure-target-branch-validator-extension/master/marketplace/logo.png">

The TargetBranchValidator Azure Pipeline Extension is a tool designed to help ensure that pull requests are targeting the correct branches for different release stages in your development workflow.

## Features

-   Validates target branches for pull requests against release stages.
-   Prevents pull requests from being merged into incorrect branches.
-   Helps maintain a structured and organized release process.

## Installation

To use the TargetBranchValidator Azure Pipeline Extension, you need to add it to your Azure DevOps Pipeline configuration. Here's how:

1. Open your Azure DevOps project.
2. Navigate to Pipelines > Pipeline settings > Extensions.
3. Search for "TargetBranchValidator" and install the extension.
4. Configure the extension in your pipeline YAML file.

## Configuration

In your pipeline YAML file, you can configure the TargetBranchValidator extension by adding a step similar to the following:

```yaml
- task: TargetBranchValidator@0
  inputs:
      branches: 'develop, prerelease, master'
      releases: '1.0.0, 2.0.0, 3.0.0'
      fieldName: 'Custom.Release'
```

-   **branches** - List of target branches which we need to check out
-   **releases** - List of releases which we have in target branches
-   **fieldName** - Name of filed from task which we need to take for comparing

## Motivation

Within our development team, we manage a variety of branches, each dedicated to distinct releases. On occasion, team members inadvertently create pull requests in branches that aren't aligned with the intended release target. To address this challenge, we have implemented an automated solution using Azure Pipelines. Now, when a pull request is initiated, our extension examines the connected tasks within the pull request and conducts a thorough comparison between task attributes and the specified target branch. This process ensures that pull requests are seamlessly validated against the appropriate target branch, promoting a streamlined and error-free development workflow.

## License

This project is licensed under the MIT License.
