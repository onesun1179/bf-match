import {useCallback} from "react";
import {
    useNavigate,
    useParams as useReactRouterParams,
    useSearchParams as useReactRouterSearchParams,
} from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();

  return {
    push: useCallback(
      (href: string) => {
        navigate(href);
      },
      [navigate],
    ),
    replace: useCallback(
      (href: string) => {
        navigate(href, { replace: true });
      },
      [navigate],
    ),
    back: useCallback(() => {
      navigate(-1);
    }, [navigate]),
    refresh: useCallback(() => {
      window.location.reload();
    }, []),
    prefetch: useCallback(async (_href: string) => {}, []),
  };
}

export function useParams<T extends Record<string, string | undefined>>() {
  return useReactRouterParams() as T;
}

export function useSearchParams() {
  const [params] = useReactRouterSearchParams();
  return params;
}
