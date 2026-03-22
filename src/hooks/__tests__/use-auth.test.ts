import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const anonWork = {
  messages: [{ id: "1", role: "user", content: "Hello" }],
  fileSystemData: { "/App.jsx": { type: "file", content: "export default () => <div/>" } },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  describe("initial state", () => {
    test("isLoading starts false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    test("calls signInAction with email and password", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(signInAction).toHaveBeenCalledWith("user@example.com", "password");
    });

    test("sets isLoading to true during call and false after", async () => {
      let resolveFn!: () => void;
      vi.mocked(signInAction).mockReturnValue(
        new Promise((resolve) => { resolveFn = () => resolve({ success: false }); })
      );

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("user@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFn();
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction", async () => {
      const mockResult = { success: false, error: "Invalid credentials" };
      vi.mocked(signInAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrong");
      });

      expect(returnValue).toEqual(mockResult);
    });

    test("does not call handlePostSignIn on failure", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Bad credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even when signInAction throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with email and password", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password");
      });

      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "password");
    });

    test("returns the result from signUpAction", async () => {
      const mockResult = { success: false, error: "Email taken" };
      vi.mocked(signUpAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("taken@example.com", "pass");
      });

      expect(returnValue).toEqual(mockResult);
    });

    test("sets isLoading to true during call and false after", async () => {
      let resolveFn!: () => void;
      vi.mocked(signUpAction).mockReturnValue(
        new Promise((resolve) => { resolveFn = () => resolve({ success: false }); })
      );

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("new@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFn();
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not call handlePostSignIn on failure", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("taken@example.com", "pass");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even when signUpAction throws", async () => {
      vi.mocked(signUpAction).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("user@example.com", "pass").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn — anonymous work exists", () => {
    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProject).mockResolvedValue({ id: "anon-project-id" } as any);
    });

    test("creates a project from anonymous work data", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
    });

    test("clears anonymous work after creating project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(clearAnonWork).toHaveBeenCalled();
    });

    test("navigates to the new project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("does not call getProjects when anon work exists", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(getProjects).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anonymous work, existing projects", () => {
    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([
        { id: "project-1" },
        { id: "project-2" },
      ] as any);
    });

    test("navigates to the most recent project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    test("does not create a new project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anonymous work, no existing projects", () => {
    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([] as any);
      vi.mocked(createProject).mockResolvedValue({ id: "new-project-id" } as any);
    });

    test("creates a new empty project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
    });

    test("navigates to the newly created project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/new-project-id");
    });
  });

  describe("handlePostSignIn — anon work with empty messages", () => {
    test("treats empty anon messages as no anon work", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
      vi.mocked(getProjects).mockResolvedValue([{ id: "existing-project" }] as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      // Should skip anon work path and go to existing projects
      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });
  });

  describe("signUp triggers the same post-sign-in flow", () => {
    test("navigates to anon project after successful signUp", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProject).mockResolvedValue({ id: "signup-project-id" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/signup-project-id");
    });

    test("navigates to most recent project after successful signUp with no anon work", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "recent-project" }] as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
    });
  });
});
