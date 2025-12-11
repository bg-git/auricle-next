import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";

const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me-now";

export function withAdminBasicAuth<P extends Record<string, unknown>>(
  handler: (
    ctx: GetServerSidePropsContext,
  ) => Promise<GetServerSidePropsResult<P>> | GetServerSidePropsResult<P>,
): GetServerSideProps<P> {
  return async function withAuth(
    ctx: GetServerSidePropsContext,
  ): Promise<GetServerSidePropsResult<P>> {
    // 🔓 In development, skip basic auth completely
    if (process.env.NODE_ENV === "development") {
      return handler(ctx);
    }

    const { req, res } = ctx;
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Basic ")) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Auricle Admin"');
      res.statusCode = 401;
      res.end("Authentication required");
      return { props: {} as P };
    }

    const base64 = auth.split(" ")[1];
    let decoded: string;

    try {
      decoded = Buffer.from(base64, "base64").toString("utf8");
    } catch {
      res.setHeader("WWW-Authenticate", 'Basic realm="Auricle Admin"');
      res.statusCode = 401;
      res.end("Authentication required");
      return { props: {} as P };
    }

    const [username, password] = decoded.split(":");

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Auricle Admin"');
      res.statusCode = 401;
      res.end("Authentication required");
      return { props: {} as P };
    }

    return handler(ctx);
  };
}
