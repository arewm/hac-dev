import '@testing-library/jest-dom';
import { renderHook } from '@testing-library/react-hooks';
import { useApplicationHealthStatus } from '../../../../../../../../hooks';
import { GitOpsDeploymentHealthStatus } from '../../../../../../../../types/gitops-deployment';
import { useNamespace } from '../../../../../../../../utils/namespace-context-utils';
import {
  useBuildPipelines,
  useComponents,
  useEnvironments,
  useIntegrationTestScenarios,
  useReleasePlans,
} from '../../../../../../../hooks';
import { WorkflowNodeType } from '../../types';
import {
  sampleBuildPipelines,
  sampleComponents,
  sampleEnvironments,
} from '../__data__/workflow-data';
import { useAppWorkflowData } from '../useAppWorkflowData';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  useK8sWatchResource: jest.fn(),
}));

jest.mock('../../../../../../../../utils/namespace-context-utils', () => ({
  useNamespace: jest.fn(() => 'test-ns'),
}));

jest.mock('../../../../../../../../hooks/', () => ({
  useApplicationHealthStatus: jest.fn(() => [[], true]),
}));

jest.mock('../../../../../../../hooks/', () => ({
  useComponents: jest.fn(() => [[], true]),
  useIntegrationTestScenarios: jest.fn(() => [[], true]),
  useBuildPipelines: jest.fn(() => [[], true]),
  useEnvironments: jest.fn(() => [[], true]),
  useReleasePlans: jest.fn(() => [[], true]),
}));

const useActiveNamespaceMock = useNamespace as jest.Mock;
const useApplicationHealthStatusMock = useApplicationHealthStatus as jest.Mock;
const useComponentsMock = useComponents as jest.Mock;
const useIntegrationTestScenariosMock = useIntegrationTestScenarios as jest.Mock;
const useBuildPipelinesMock = useBuildPipelines as jest.Mock;
const useEnvironmentsMock = useEnvironments as jest.Mock;
const useReleasePlansMock = useReleasePlans as jest.Mock;

describe('useAppWorkflowData hook', () => {
  beforeEach(() => {
    useActiveNamespaceMock.mockReturnValue('test-ns');
    useApplicationHealthStatusMock.mockReturnValue([
      GitOpsDeploymentHealthStatus.Degraded,
      null,
      true,
    ]);
    useComponentsMock.mockReturnValue([[], true]);
    useIntegrationTestScenariosMock.mockReturnValue([[], true]);
    useBuildPipelinesMock.mockReturnValue([[], true]);
    useEnvironmentsMock.mockReturnValue([[], true]);
    useReleasePlansMock.mockReturnValue([[], true]);

    const createElement = document.createElement.bind(document);
    document.createElement = (tagName) => {
      if (tagName === 'canvas') {
        return {
          getContext: () => ({
            measureText: () => ({}),
          }),
        };
      }
      return createElement(tagName);
    };
  });

  afterEach(jest.resetAllMocks);

  it('should early return empty values if any one of the resources is not loaded', () => {
    useComponentsMock.mockReturnValue([[], false]);
    const { result } = renderHook(() => useAppWorkflowData('test', false));
    const [model, loaded] = result.current;

    expect(model.nodes).toHaveLength(0);
    expect(loaded).toBe(false);
  });

  it('should return the basic workflow nodes', () => {
    const { result } = renderHook(() => useAppWorkflowData('test', false));
    const [model, loaded] = result.current;

    expect(model.nodes).toHaveLength(6);
    expect(model.edges).toHaveLength(5);
    expect(loaded).toBe(true);
  });

  it('should return disabled nodes if the resources are not created', () => {
    const { result } = renderHook(() => useAppWorkflowData('test', false));
    const [model, loaded] = result.current;

    expect(model.nodes).toHaveLength(6);
    expect(model.nodes.filter((n) => n.data.isDisabled)).toHaveLength(6);
    expect(loaded).toBe(true);
  });

  it('Abstract nodes should contain static name', () => {
    useComponentsMock.mockReturnValue([sampleComponents, true]);
    useBuildPipelinesMock.mockReturnValue([sampleBuildPipelines, true]);

    const { result } = renderHook(() => useAppWorkflowData('test', false));
    const [model] = result.current;

    expect(model.nodes[0].label).toBe('Components');
    expect(model.nodes[1].label).toBe('Builds');
  });

  it('Non Abstract nodes should contain the child resources', () => {
    useEnvironmentsMock.mockReturnValue([sampleEnvironments, true]);

    const { result } = renderHook(() => useAppWorkflowData('test', false));
    const [model] = result.current;
    const environmentNode = model.nodes.find(
      (n) => n.data.workflowType === WorkflowNodeType.STATIC_ENVIRONMENT,
    );

    expect(environmentNode.data.resources.length).toBe(3);
  });

  it('nodes should be disabled / enabled based on the availability of resources', () => {
    useEnvironmentsMock.mockReturnValue([sampleEnvironments, true]);

    const { result } = renderHook(() => useAppWorkflowData('test', false));
    const [model] = result.current;
    const disabledNodes = model.nodes.filter((n) => n.data.isDisabled);
    const enabledNodes = model.nodes.filter((node) => !node.data.isDisabled);

    expect(disabledNodes).toHaveLength(5);
    expect(enabledNodes).toHaveLength(1);
  });

  it('label should change based on the availability of resources', () => {
    useComponentsMock.mockReturnValue([sampleComponents, true]);

    const { result } = renderHook(() => useAppWorkflowData('test', false));
    const [model] = result.current;
    const sourceNode = model.nodes.find((n) => n.data.workflowType === WorkflowNodeType.COMPONENT);
    const environmentNode = model.nodes.find(
      (n) => n.data.workflowType === WorkflowNodeType.STATIC_ENVIRONMENT,
    );

    expect(sourceNode.label).toBe('Components');
    expect(environmentNode.label).toBe('No static environments set');
  });

  it('should return the expanded workflow model', () => {
    const { result } = renderHook(() => useAppWorkflowData('test', true));
    const [model] = result.current;

    expect(model.nodes).toHaveLength(13);
    expect(model.edges).toHaveLength(6);
    expect(
      model.nodes.filter((n) => n.data.workflowType === WorkflowNodeType.COMPONENT),
    ).toHaveLength(2);
  });

  it('should return groups in the expanded workflow model', () => {
    const { result } = renderHook(() => useAppWorkflowData('test', true));
    const [model] = result.current;

    expect(model.nodes.filter((n) => n.group)).toHaveLength(6);
  });
});
