import { Finding } from "../Finding";
import { Project, ScssFile } from "../model";
import { ScssRule } from "./ScssRule";
import { Occurrence, Utils } from "../";

export class FN022002_SCSS_add_fabric_react extends ScssRule {
  /* istanbul ignore next */
  constructor(private importValue: string) {
    super();
  }

  get id(): string {
    return 'FN022002';
  }

  get title(): string {
    return `Scss file import`;
  }

  get description(): string {
    return `Add scss file import`;
  };

  get resolution(): string {
    return `@import '${this.importValue}'`;
  };

  get resolutionType(): string {
    return 'scss';
  };

  get severity(): string {
    return 'Optional';
  };

  get file(): string {
    return '';
  };

  visit(project: Project, findings: Finding[]): void {
    if (Utils.isReactProject(project) === false) {
      return;
    }

    if (!project.scssFiles ||
      project.scssFiles.length === 0) {
      return;
    }

    const occurrences: Occurrence[] = [];
    project.scssFiles.forEach((file: ScssFile) => {
      if ((file.source as string).indexOf(this.importValue) === -1) {
        this.addOccurrence(this.resolution, file.path, project.path, occurrences);
      }
    });
    
    if (occurrences.length > 0) {
      this.addFindingWithOccurrences(occurrences, findings);
    }
  }
}